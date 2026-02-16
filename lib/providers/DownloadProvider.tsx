import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCache, useCoverBuilder, useServer, useSubsonicParams } from '@lib/hooks';
import {
    DownloadManager,
    TrackItem,
    useDownloadActions,
    useDownloadedTracks,
    useDownloadProgress,
    useDownloadStorage,
    DownloadedTrack,
    DownloadProgress,
    DownloadStorageInfo,
} from 'react-native-nitro-player';
import { Child } from '@lib/types';
import qs from 'qs';
import showToast from '@lib/showToast';
import { IconCircleCheck, IconCircleX, IconDownload } from '@tabler/icons-react-native';

export type DownloadContextType = {
    downloadTrack: (child: Child, playlistId?: string) => Promise<void>;
    downloadTrackById: (id: string) => Promise<void>;
    downloadPlaylist: (playlistId: string, tracks: Child[]) => Promise<void>;
    deleteTrack: (trackId: string) => Promise<void>;
    deleteAll: () => Promise<void>;
    cancelDownload: (downloadId: string) => Promise<void>;
    pauseDownload: (downloadId: string) => Promise<void>;
    resumeDownload: (downloadId: string) => Promise<void>;
    retryDownload: (downloadId: string) => Promise<void>;

    isTrackDownloaded: (trackId: string) => boolean;
    getTrackProgress: (trackId: string) => DownloadProgress | undefined;
    getDownloadingMeta: (trackId: string) => Child | undefined;

    downloadedTracks: DownloadedTrack[];
    activeDownloads: DownloadProgress[];
    refreshDownloaded: () => void;
    isDownloading: boolean;

    storageInfo: DownloadStorageInfo | null;
    formattedSize: string;
    refreshStorage: () => Promise<void>;
}

const initial: DownloadContextType = {
    downloadTrack: async () => { },
    downloadTrackById: async () => { },
    downloadPlaylist: async () => { },
    deleteTrack: async () => { },
    deleteAll: async () => { },
    cancelDownload: async () => { },
    pauseDownload: async () => { },
    resumeDownload: async () => { },
    retryDownload: async () => { },
    isTrackDownloaded: () => false,
    getTrackProgress: () => undefined,
    getDownloadingMeta: () => undefined,
    downloadedTracks: [],
    activeDownloads: [],
    refreshDownloaded: () => { },
    isDownloading: false,
    storageInfo: null,
    formattedSize: '0 B',
    refreshStorage: async () => { },
};

export const DownloadContext = createContext<DownloadContextType>(initial);

export default function DownloadProvider({ children }: { children?: React.ReactNode }) {
    const { server } = useServer();
    const params = useSubsonicParams();
    const cover = useCoverBuilder();
    const cache = useCache();

    const actions = useDownloadActions();
    const downloaded = useDownloadedTracks();
    const progress = useDownloadProgress();
    const storage = useDownloadStorage();

    const [downloadingMeta, setDownloadingMeta] = useState<Map<string, Child>>(new Map());
    const initializedRef = useRef(false);
    const metaFetchInFlightRef = useRef<Set<string>>(new Set());
    const metaFetchUnavailableRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        DownloadManager.configure({
            maxConcurrentDownloads: 3,
            autoRetry: true,
            maxRetryAttempts: 3,
            downloadArtwork: true,
            backgroundDownloadsEnabled: true,
        });
        DownloadManager.setPlaybackSourcePreference('auto');
        try {
            DownloadManager.syncDownloads();
        } catch {
            return;
        }

        DownloadManager.onDownloadComplete((track) => {
            setDownloadingMeta(prev => {
                const next = new Map(prev);
                next.delete(track.trackId);
                return next;
            });
            showToast({
                title: 'Download Complete',
                subtitle: track.originalTrack.title || track.trackId,
                icon: IconCircleCheck,
            });
            downloaded.refresh();
            storage.refresh();
        });

        DownloadManager.onDownloadStateChange((_downloadId, trackId, state, error) => {
            if (state === 'failed' || state === 'cancelled' || state === 'completed') {
                setDownloadingMeta(prev => {
                    const next = new Map(prev);
                    next.delete(trackId);
                    return next;
                });
            }
            if (state === 'completed') {
                downloaded.refresh();
                storage.refresh();
            }
            if (state === 'failed' && error) {
                showToast({
                    title: 'Download Failed',
                    subtitle: error.message,
                    icon: IconCircleX,
                    haptics: 'error',
                });
            }
        });
    }, []);

    const convertToTrackItem = useCallback((child: Child): TrackItem => {
        const streamUrl = `${server.url}/rest/stream?${qs.stringify({ id: child.id, ...params })}`;
        return {
            id: child.id,
            title: child.title ?? '',
            artist: child.artist ?? '',
            album: child.album ?? '',
            duration: child.duration ?? 0,
            url: streamUrl,
            artwork: cover.generateUrl(child.coverArt || child.id),
            extraPayload: { _child: child } as any,
        };
    }, [server.url, params, cover.generateUrl]);

    const downloadTrack = useCallback(async (child: Child, playlistId?: string) => {
        if (DownloadManager.isTrackDownloaded(child.id)) {
            showToast({ title: 'Already Downloaded', subtitle: child.title });
            return;
        }
        if (DownloadManager.isDownloading(child.id)) {
            showToast({ title: 'Already Downloading', subtitle: child.title });
            return;
        }
        const trackItem = convertToTrackItem(child);
        setDownloadingMeta(prev => new Map(prev).set(child.id, child));
        try {
            await actions.downloadTrack(trackItem, playlistId);
            showToast({ title: 'Downloading', subtitle: child.title, icon: IconDownload });
        } catch (e) {
            setDownloadingMeta(prev => {
                const next = new Map(prev);
                next.delete(child.id);
                return next;
            });
            showToast({ title: 'Download Error', subtitle: String(e), haptics: 'error', icon: IconCircleX });
        }
    }, [convertToTrackItem, actions.downloadTrack]);

    const downloadTrackById = useCallback(async (id: string) => {
        const child = await cache.fetchChild(id);
        if (!child) return;
        await downloadTrack(child);
    }, [cache.fetchChild, downloadTrack]);

    const downloadPlaylist = useCallback(async (playlistId: string, tracks: Child[]) => {
        const trackItems = tracks.map(convertToTrackItem);
        setDownloadingMeta(prev => {
            const next = new Map(prev);
            tracks.forEach(track => next.set(track.id, track));
            return next;
        });
        try {
            await actions.downloadPlaylist(playlistId, trackItems);
            showToast({ title: 'Downloading', subtitle: `${tracks.length} tracks`, icon: IconDownload });
        } catch (e) {
            setDownloadingMeta(prev => {
                const next = new Map(prev);
                tracks.forEach(track => next.delete(track.id));
                return next;
            });
            showToast({ title: 'Download Error', subtitle: String(e), haptics: 'error', icon: IconCircleX });
        }
    }, [convertToTrackItem, actions.downloadPlaylist]);

    const deleteTrack = useCallback(async (trackId: string) => {
        await actions.deleteTrack(trackId);
        downloaded.refresh();
        storage.refresh();
    }, [actions.deleteTrack, downloaded.refresh, storage.refresh]);

    const deleteAll = useCallback(async () => {
        await actions.deleteAll();
        downloaded.refresh();
        storage.refresh();
    }, [actions.deleteAll, downloaded.refresh, storage.refresh]);

    const getDownloadingMeta = useCallback((trackId: string): Child | undefined => {
        return downloadingMeta.get(trackId);
    }, [downloadingMeta]);

    useEffect(() => {
        const missingTrackIds = progress.progressList
            .map(p => p.trackId)
            .filter(trackId =>
                !downloadingMeta.has(trackId) &&
                !metaFetchUnavailableRef.current.has(trackId)
            );

        if (missingTrackIds.length === 0) {
            return;
        }

        missingTrackIds.forEach(trackId => {
            if (metaFetchInFlightRef.current.has(trackId)) {
                return;
            }
            metaFetchInFlightRef.current.add(trackId);

            cache.fetchChild(trackId)
                .then(child => {
                    if (!child) {
                        metaFetchUnavailableRef.current.add(trackId);
                        return;
                    }
                    setDownloadingMeta(prev => {
                        if (prev.has(trackId)) {
                            return prev;
                        }
                        const next = new Map(prev);
                        next.set(trackId, child);
                        return next;
                    });
                })
                .catch(() => undefined)
                .finally(() => {
                    metaFetchInFlightRef.current.delete(trackId);
                });
        });
    }, [progress.progressList, downloadingMeta, cache.fetchChild]);

    const pauseDownload = useCallback(async (downloadId: string) => {
        try {
            await actions.pauseDownload(downloadId);
        } catch (e) {
            showToast({ title: 'Pause Failed', subtitle: String(e), haptics: 'error', icon: IconCircleX });
            throw e;
        }
    }, [actions.pauseDownload]);

    const resumeDownload = useCallback(async (downloadId: string) => {
        try {
            await actions.resumeDownload(downloadId);
        } catch (e) {
            showToast({ title: 'Resume Failed', subtitle: String(e), haptics: 'error', icon: IconCircleX });
            throw e;
        }
    }, [actions.resumeDownload]);

    const cancelDownload = useCallback(async (downloadId: string) => {
        try {
            await actions.cancelDownload(downloadId);
        } catch (e) {
            showToast({ title: 'Cancel Failed', subtitle: String(e), haptics: 'error', icon: IconCircleX });
            throw e;
        }
    }, [actions.cancelDownload]);

    const retryDownload = useCallback(async (downloadId: string) => {
        try {
            await actions.retryDownload(downloadId);
        } catch (e) {
            showToast({ title: 'Retry Failed', subtitle: String(e), haptics: 'error', icon: IconCircleX });
            throw e;
        }
    }, [actions.retryDownload]);

    const filteredActiveDownloads = useMemo(() =>
        progress.progressList.filter(p =>
            p.state === 'pending' || p.state === 'downloading' || p.state === 'paused'
        ),
        [progress.progressList]
    );

    return (
        <DownloadContext.Provider value={{
            downloadTrack,
            downloadTrackById,
            downloadPlaylist,
            deleteTrack,
            deleteAll,
            cancelDownload,
            pauseDownload,
            resumeDownload,
            retryDownload,
            isTrackDownloaded: downloaded.isTrackDownloaded,
            getTrackProgress: progress.getProgress,
            getDownloadingMeta,
            downloadedTracks: downloaded.downloadedTracks,
            activeDownloads: filteredActiveDownloads,
            refreshDownloaded: downloaded.refresh,
            isDownloading: progress.isDownloading,
            storageInfo: storage.storageInfo,
            formattedSize: storage.formattedSize,
            refreshStorage: storage.refresh,
        }}>
            {children}
        </DownloadContext.Provider>
    );
}
