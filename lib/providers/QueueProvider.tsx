import { Child } from '@lib/types';
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useCache } from '@lib/hooks/useCache';
import { useApi, useApiHelpers, useCoverBuilder, useServer, useSubsonicParams, useSetting } from '@lib/hooks';
import qs from 'qs';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';
import { TrackPlayer, PlayerQueue, useOnPlaybackProgressChange, TrackItem } from 'react-native-nitro-player';
import showToast from '@lib/showToast';
import { IconExclamationCircle } from '@tabler/icons-react-native';
import { shuffleArray } from '@lib/util';

export type RepeatModeValue = 'off' | 'Playlist' | 'track';

export type ClearConfirmOptions = {
    wait?: boolean;
    onConfirm?: () => void;
}

export type QueueReplaceOptions = {
    initialIndex?: number;
    source?: QueueSource;
    shuffle?: boolean;
}

export type TQueueItem = TrackItem & { _child: Child };

export type QueueSource = {
    source: 'playlist' | 'album' | 'none';
    sourceId?: string;
    sourceName?: string;
}

const initialSource: QueueSource = {
    source: 'none',
}

export type QueueContextType = {
    queue: TQueueItem[];
    source: QueueSource;
    nowPlaying: Child;
    activeIndex: number;
    canGoForward: boolean;
    canGoBackward: boolean;
    setQueue: (queue: TQueueItem[]) => void;
    add: (id: string) => Promise<boolean>;
    clear: () => void;
    clearConfirm: (options?: ClearConfirmOptions) => Promise<boolean>;
    jumpTo: (index: number) => void;
    skipBackward: () => void;
    skipForward: () => void;
    replace: (items: Child[], options?: QueueReplaceOptions) => void;
    playTrackNow: (id: string) => Promise<boolean>;
    playNext: (id: string) => Promise<boolean>;
    repeatMode: RepeatModeValue;
    changeRepeatMode: (mode: RepeatModeValue) => Promise<void>;
    cycleRepeatMode: () => Promise<void>;
    toggleStar: () => Promise<void>;
}

const initialQueueContext: QueueContextType = {
    queue: [],
    source: initialSource,
    nowPlaying: {
        id: '',
        isDir: false,
        title: '',
    },
    activeIndex: 0,
    canGoBackward: false,
    canGoForward: false,
    setQueue: () => { },
    add: async (id: string) => false,
    clear: () => { },
    clearConfirm: async () => false,
    jumpTo: (index: number) => { },
    skipBackward: () => { },
    skipForward: () => { },
    replace: (items: Child[]) => { },
    playTrackNow: async (id: string) => false,
    playNext: async (id: string) => false,
    repeatMode: 'off',
    changeRepeatMode: async () => { },
    cycleRepeatMode: async () => { },
    toggleStar: async () => { },
}

export const QueueContext = createContext<QueueContextType>(initialQueueContext);

export type StreamOptions = {
    id: string;
    maxBitRate?: string;
    format?: string;
    timeOffset?: string;
    estimateContentLength?: boolean;
}

export default function QueueProvider({ children }: { children?: React.ReactNode }) {
    const [queue, setQueue] = useState<TQueueItem[]>([]);
    const [nowPlaying, setNowPlaying] = useState<Child>(initialQueueContext.nowPlaying);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [source, setSource] = useState<QueueSource>(initialSource);
    const [repeatMode, setRepeatMode] = useState<RepeatModeValue>('off');
    const playlistIdRef = useRef<string>('agin-queue');

    const canGoBackward = nowPlaying.id != '';
    const canGoForward = activeIndex < (queue.length ?? 0) - 1;

    const cache = useCache();
    const api = useApi();
    const params = useSubsonicParams();
    const { server } = useServer();
    const cover = useCoverBuilder();
    const helpers = useApiHelpers();
    const maxBitRate = useSetting('streaming.maxBitRate') as string | undefined;
    const streamingFormat = useSetting('streaming.format') as string | undefined;

    const progressRef = useRef<number>(0);
    useOnPlaybackProgressChange(({ position }) => {
        progressRef.current = position;
    });

    useEffect(() => {
        (async () => {
            if (nowPlaying.id == '' || !api) return;
            console.log('scrobbling', nowPlaying.id);

            await api.get('/scrobble', { params: { id: nowPlaying.id } });
        })();
    }, [api, nowPlaying]);

    const generateMediaUrl = useCallback((options: StreamOptions) => {
        const streamParams: StreamOptions = { ...options };
        if (maxBitRate && maxBitRate !== '0') {
            streamParams.maxBitRate = maxBitRate;
        }
        if (streamingFormat && streamingFormat !== 'raw') {
            streamParams.format = streamingFormat;
        }
        return `${server.url}/rest/stream?${qs.stringify({ ...params, ...streamParams })}`;
    }, [params, server.url, maxBitRate, streamingFormat]);

    const convertToTrackItem = useCallback((data: Child): TQueueItem => ({
        id: data.id,
        title: data.title ?? '',
        artist: data.artist ?? '',
        album: data.album ?? '',
        duration: data.duration ?? 0,
        url: generateMediaUrl({ id: data.id }),
        artwork: cover.generateUrl(data.id),
        extraPayload: { _child: data },
        _child: data,
    }), [generateMediaUrl, cover.generateUrl]);

    const updateNowPlaying = useCallback(async () => {
        console.log('updating...');

        try {
            const state = TrackPlayer.getState();
            const currentQueue = TrackPlayer.getActualQueue();
            if (!currentQueue || currentQueue.length === 0) return;

            const currentIndex = state?.currentIndex ?? 0;
            const track = currentQueue[currentIndex] as TQueueItem | undefined;
            if (!track) return;

            const child = track._child ?? track.extraPayload?._child;
            if (child) setNowPlaying(child);
        } catch (e) {
            console.log('updateNowPlaying error', e);
        }
    }, []);

    const updateQueue = useCallback(async () => {
        try {
            const currentQueue = TrackPlayer.getActualQueue();
            console.log('updq', { queue: currentQueue });
            setQueue((currentQueue ?? []) as TQueueItem[]);
        } catch (e) {
            console.log('updateQueue error', e);
        }
    }, []);

    const updateActive = useCallback(async () => {
        try {
            const state = TrackPlayer.getState();
            const currentIndex = state?.currentIndex ?? 0;
            setActiveIndex(currentIndex);
        } catch (e) {
            console.log('updateActive error', e);
        }
    }, []);

    useEffect(() => {
        updateNowPlaying();
        updateQueue();
        updateActive();
    }, []);

    useEffect(() => {
        const unsubscribe = TrackPlayer.onChangeTrack(() => {
            updateNowPlaying();
            updateActive();
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [updateNowPlaying, updateActive]);

    const modifyQueue = useCallback(async (tracks: TQueueItem[]): Promise<void> => {
        try {
            const currentQueue = TrackPlayer.getActualQueue() as TQueueItem[];
            const state = TrackPlayer.getState();
            const currentlyPlaying = state?.currentIndex ?? null;

            if (currentlyPlaying === null || !currentQueue || currentQueue.length === 0) {
                // No track playing, replace entire queue
                PlayerQueue.createPlaylist(playlistIdRef.current, tracks);
                PlayerQueue.loadPlaylist(playlistIdRef.current);
                await updateQueue();
                await updateActive();
                return;
            }

            const currentlyPlayingMetadata = currentQueue[currentlyPlaying];
            const newCurrentIndex = tracks.findIndex(track => track._child.id === currentlyPlayingMetadata._child?.id);

            // Rebuild the playlist with the new track order
            PlayerQueue.createPlaylist(playlistIdRef.current, tracks);
            PlayerQueue.loadPlaylist(playlistIdRef.current);
            if (newCurrentIndex >= 0) {
                TrackPlayer.skipToIndex(newCurrentIndex);
            }

            await updateQueue();
            await updateActive();
        } catch (e) {
            console.log('modifyQueue error', e);
        }
    }, []);

    const add = useCallback(async (id: string) => {
        const data = await cache.fetchChild(id);
        if (!data) return false;

        const trackItem = convertToTrackItem(data);
        const currentQueue = TrackPlayer.getActualQueue();

        if (!currentQueue || currentQueue.length === 0) {
            PlayerQueue.createPlaylist(playlistIdRef.current, [trackItem]);
            PlayerQueue.loadPlaylist(playlistIdRef.current);
            TrackPlayer.play();
        } else {
            TrackPlayer.addToUpNext([trackItem]);
        }

        await updateQueue();
        await updateActive();
        return true;
    }, [cache, convertToTrackItem]);

    const playNext = useCallback(async (id: string) => {
        const data = await cache.fetchChild(id);
        if (!data) return false;

        const trackItem = convertToTrackItem(data);
        TrackPlayer.playNext([trackItem]);

        await updateQueue();
        await updateActive();
        return true;
    }, [cache, convertToTrackItem]);

    const playTrackNow = useCallback(async (id: string) => {
        const data = await cache.fetchChild(id);
        if (!data) {
            await showToast({
                title: 'Track Not Found',
                subtitle: 'The track you\'re trying to play does not exist on this server.',
                icon: IconExclamationCircle,
                haptics: 'error',
            });
            return false;
        }

        const trackItem = convertToTrackItem(data);
        PlayerQueue.createPlaylist(playlistIdRef.current, [trackItem]);
        PlayerQueue.loadPlaylist(playlistIdRef.current);
        TrackPlayer.play();

        await updateQueue();
        await updateActive();
        return true;
    }, [cache, convertToTrackItem]);

    const replace = useCallback(async (items: Child[], options?: QueueReplaceOptions) => {
        let itemsCopy = [...items];
        if (options?.shuffle) itemsCopy = shuffleArray(itemsCopy);
        if (options?.source) setSource(options.source);

        const tracks = itemsCopy.map(convertToTrackItem);
        PlayerQueue.createPlaylist(playlistIdRef.current, tracks);
        PlayerQueue.loadPlaylist(playlistIdRef.current);

        const initialIndex = options?.initialIndex ?? 0;
        if (initialIndex > 0) {
            TrackPlayer.skipToIndex(initialIndex);
        }
        TrackPlayer.play();

        await updateQueue();
        await updateActive();
    }, [convertToTrackItem]);

    const clear = useCallback(async () => {
        TrackPlayer.pause();
        PlayerQueue.createPlaylist(playlistIdRef.current, []);
        PlayerQueue.loadPlaylist(playlistIdRef.current);

        setQueue([]);
        await updateQueue();
        await updateActive();
        setNowPlaying(initialQueueContext.nowPlaying);
    }, []);

    const clearConfirm = useCallback(async (options?: ClearConfirmOptions) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const confirmed = await SheetManager.show('confirm', {
            payload: {
                title: 'Clear Queue',
                message: 'Are you sure you want to clear the queue?',
                confirmText: 'Clear',
                cancelText: 'Cancel',
            },
        });
        if (!confirmed) return false;

        if (options?.wait) {
            TrackPlayer.pause();
            if (options?.onConfirm) options.onConfirm();
            await new Promise(r => setTimeout(r, 500));
        }

        clear();
        return true;
    }, [clear]);

    const jumpTo = useCallback((index: number) => {
        console.log('jumping to', index);

        TrackPlayer.skipToIndex(index);
        updateActive();
    }, [queue]);

    const skipForward = useCallback(async () => {
        await TrackPlayer.skipToNext();
        updateActive();
    }, []);

    const skipBackward = useCallback(async () => {
        const position = progressRef.current;
        console.log('skipping backward', position);

        if (position > 5) {
            await TrackPlayer.seek(0);
        } else {
            await TrackPlayer.skipToPrevious();
            await updateActive();
        }
    }, [jumpTo]);

    const changeRepeatMode = useCallback(async (mode: RepeatModeValue) => {
        setRepeatMode(mode);
        TrackPlayer.setRepeatMode(mode);
    }, []);

    const cycleRepeatMode = useCallback(async () => {
        if (repeatMode === 'off') {
            await changeRepeatMode('Playlist');
        } else if (repeatMode === 'Playlist') {
            await changeRepeatMode('track');
        } else {
            await changeRepeatMode('off');
        }
    }, [repeatMode]);

    const setStarred = useCallback(async (set: boolean) => {
        const starred = set ? new Date() : undefined;
        setNowPlaying(nowPlaying => ({ ...nowPlaying, starred }));
        setQueue(q => q.map(x => x.id === nowPlaying.id ? ({ ...x, starred }) : x));
    }, [queue, nowPlaying, cache]);

    const toggleStar = useCallback(async () => {
        console.log('toggle', nowPlaying.starred);

        if (!nowPlaying.id) return;

        await setStarred(!nowPlaying.starred);

        try {
            await helpers.star(nowPlaying.id, 'track', nowPlaying.starred ? 'unstar' : 'star');
        } catch (error) {
            await showToast({
                haptics: 'error',
                icon: IconExclamationCircle,
                title: 'Error',
                subtitle: 'An error occurred while liking the track.',
            });
            return;
        }

        await cache.fetchChild(nowPlaying.id, true);
    }, [queue, nowPlaying, cache]);

    return (
        <QueueContext.Provider value={{
            queue,
            nowPlaying,
            canGoBackward,
            canGoForward,
            activeIndex,
            add,
            clear,
            setQueue: modifyQueue,
            jumpTo,
            skipBackward,
            skipForward,
            replace,
            clearConfirm,
            source,
            playTrackNow,
            playNext,
            repeatMode,
            changeRepeatMode,
            cycleRepeatMode,
            toggleStar,
        }}>
            {children}
        </QueueContext.Provider>
    )
}
