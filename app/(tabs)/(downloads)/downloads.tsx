import Container from "@lib/components/Container";
import FullscreenMessage from "@lib/components/FullscreenMessage";
import Header from "@lib/components/Header";
import Title from "@lib/components/Title";
import Cover from "@lib/components/Cover";
import ActionIcon from "@lib/components/ActionIcon";
import { useColors, useCoverBuilder, useDownloads, useQueue, useTabsHeight } from "@lib/hooks";
import { IconCircleArrowDown, IconPlayerPause, IconPlayerPlay, IconTrash, IconX } from "@tabler/icons-react-native";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated as RNAnimated, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SheetManager } from "react-native-actions-sheet";
import * as Haptics from "expo-haptics";
import showToast from "@lib/showToast";
import { DownloadedTrack, DownloadProgress } from "react-native-nitro-player";
import { Child } from "@lib/types";

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type DownloadRow =
    | { type: 'active'; key: string; data: DownloadProgress; meta?: Child }
    | { type: 'completed'; key: string; data: DownloadedTrack }
    | { type: 'header'; key: string; title: string };

const ActiveDownloadItem = React.memo(function ActiveDownloadItem({
    progress,
    meta,
    onPause,
    onResume,
    onCancel,
}: {
    progress: DownloadProgress;
    meta?: Child;
    onPause: (downloadId: string) => void;
    onResume: (downloadId: string) => void;
    onCancel: (downloadId: string) => void;
}) {
    const cover = useCoverBuilder();
    const colors = useColors();
    const percentage = Math.round(progress.progress * 100);
    const coverArt = meta?.coverArt;
    const isPaused = progress.state === 'paused';

    const animatedProgress = useRef(new RNAnimated.Value(progress.progress)).current;
    useEffect(() => {
        RNAnimated.timing(animatedProgress, {
            toValue: progress.progress,
            duration: 400,
            useNativeDriver: false,
        }).start();
    }, [progress.progress]);

    const animatedWidth = animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
    });

    const statusText = progress.state === 'pending'
        ? 'Waiting...'
        : isPaused
            ? `Paused \u2022 ${percentage}%`
            : percentage >= 100
                ? 'Finalizing...'
                : `${percentage}% \u2022 ${formatBytes(progress.bytesDownloaded)} / ${formatBytes(progress.totalBytes)}`;

    const handlePauseResume = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isPaused) {
            onResume(progress.downloadId);
        } else {
            onPause(progress.downloadId);
        }
    }, [isPaused, onPause, onResume, progress.downloadId]);

    const handleCancel = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCancel(progress.downloadId);
    }, [onCancel, progress.downloadId]);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 }}>
            <Cover
                source={coverArt ? { uri: cover.generateUrl(coverArt, { size: 128 }) } : undefined}
                cacheKey={coverArt ? `${coverArt}-128x128` : undefined}
                size={44}
                radius={6}
                withShadow={false}
            />
            <View style={{ flex: 1 }}>
                <Title size={14} numberOfLines={1}>{meta?.title ?? 'Downloading...'}</Title>
                <Title size={12} color={colors.text[1]} fontFamily="Poppins-Regular" numberOfLines={1}>{meta?.artist ?? 'Downloading...'}</Title>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.border[0], marginTop: 4, overflow: 'hidden' }}>
                    <RNAnimated.View style={{ height: '100%', width: animatedWidth, backgroundColor: isPaused ? colors.text[1] : colors.forcedTint, borderRadius: 2 }} />
                </View>
                <Title size={11} color={colors.text[1]} fontFamily="Poppins-Regular" style={{ marginTop: 2 }}>
                    {statusText}
                </Title>
            </View>
            <ActionIcon
                icon={isPaused ? IconPlayerPlay : IconPlayerPause}
                size={14}
                variant="secondary"
                onPress={handlePauseResume}
            />
            <ActionIcon
                icon={IconX}
                size={14}
                variant="secondary"
                onPress={handleCancel}
            />
        </View>
    );
}, (prev, next) => {
    if (prev.progress.trackId !== next.progress.trackId) return false;
    if (prev.progress.state !== next.progress.state) return false;
    if (prev.progress.progress !== next.progress.progress) return false;
    if (prev.meta !== next.meta) return false;
    return true;
});

const CompletedDownloadItem = React.memo(function CompletedDownloadItem({
    trackId,
    track,
    fileSize,
    localArtworkPath,
    onPlay,
    onLongPress,
}: {
    trackId: string;
    track: DownloadedTrack['originalTrack'];
    fileSize: number;
    localArtworkPath?: string | null;
    onPlay: (trackId: string) => void;
    onLongPress: (trackId: string) => void;
}) {
    const cover = useCoverBuilder();
    const colors = useColors();

    const coverArtId = (track.extraPayload as any)?._child?.coverArt;
    const coverSource = localArtworkPath
        ? { uri: `file://${localArtworkPath}` }
        : coverArtId
            ? { uri: cover.generateUrl(coverArtId, { size: 128 }) }
            : track.artwork
                ? { uri: typeof track.artwork === 'string' ? track.artwork : undefined }
                : undefined;
    const cacheKey = localArtworkPath
        ? `local-${trackId}`
        : coverArtId
            ? `${coverArtId}-128x128`
            : trackId;

    const handlePress = useCallback(() => onPlay(trackId), [onPlay, trackId]);
    const handleLongPress = useCallback(() => onLongPress(trackId), [onLongPress, trackId]);

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 }}
        >
            <Cover
                source={coverSource}
                cacheKey={cacheKey}
                size={44}
                radius={6}
                withShadow={false}
            />
            <View style={{ flex: 1 }}>
                <Title size={14} numberOfLines={1}>{track.title}</Title>
                <Title size={12} color={colors.text[1]} fontFamily="Poppins-Regular" numberOfLines={1}>
                    {track.artist} {fileSize > 0 ? `\u2022 ${formatBytes(fileSize)}` : ''}
                </Title>
            </View>
        </Pressable>
    );
}, (prev, next) => {
    if (prev.trackId !== next.trackId) return false;
    if (prev.fileSize !== next.fileSize) return false;
    if (prev.localArtworkPath !== next.localArtworkPath) return false;
    if (prev.track.title !== next.track.title) return false;
    if (prev.track.artist !== next.track.artist) return false;
    if (prev.track.artwork !== next.track.artwork) return false;
    return true;
});

export default function Downloads() {
    const [tabsHeight] = useTabsHeight();
    const colors = useColors();
    const downloads = useDownloads();
    const queue = useQueue();

    const styles = useMemo(() => StyleSheet.create({
        sectionHeader: {
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 6,
        },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 20,
            alignItems: 'center',
        },
        deleteAllBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: '#ff4d4f15',
        },
    }), [colors]);

    const handlePause = useCallback((downloadId: string) => {
        downloads.pauseDownload(downloadId).catch(() => { });
    }, [downloads.pauseDownload]);

    const handleResume = useCallback((downloadId: string) => {
        downloads.resumeDownload(downloadId).catch(() => { });
    }, [downloads.resumeDownload]);

    const handleCancelDownload = useCallback((downloadId: string) => {
        downloads.cancelDownload(downloadId).catch(() => { });
    }, [downloads.cancelDownload]);

    const handlePlay = useCallback((trackId: string) => {
        queue.playTrackNow(trackId);
    }, [queue.playTrackNow]);

    const handleLongPress = useCallback((trackId: string) => {
        Haptics.selectionAsync();
        SheetManager.show('track', {
            payload: {
                id: trackId,
                context: 'home',
            }
        });
    }, []);

    const handleDeleteAll = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const confirmed = await SheetManager.show('confirm', {
            payload: {
                title: 'Delete All Downloads',
                message: 'Are you sure you want to delete all downloaded music? This cannot be undone.',
                confirmText: 'Delete All',
                cancelText: 'Cancel',
                variant: 'danger',
            }
        });
        if (!confirmed) return;
        await downloads.deleteAll();
        showToast({ title: 'All Downloads Deleted', icon: IconTrash });
    }, [downloads.deleteAll]);

    const activeRows: DownloadRow[] = useMemo(() =>
        downloads.activeDownloads.map(p => ({
            type: 'active' as const,
            key: `active-${p.trackId}`,
            data: p,
            meta: downloads.getDownloadingMeta(p.trackId),
        })),
        [downloads.activeDownloads, downloads.getDownloadingMeta]
    );

    const activeTrackIds = useMemo(() =>
        new Set(downloads.activeDownloads.map(p => p.trackId)),
        [downloads.activeDownloads]
    );

    const completedRows: DownloadRow[] = useMemo(() =>
        downloads.downloadedTracks
            .filter(t => !activeTrackIds.has(t.trackId))
            .map(t => ({
                type: 'completed' as const,
                key: `dl-${t.trackId}`,
                data: t,
            })),
        [downloads.downloadedTracks, activeTrackIds]
    );

    const flatData: DownloadRow[] = useMemo(() => {
        const items: DownloadRow[] = [];
        if (activeRows.length > 0) {
            items.push({ type: 'header', key: 'header-downloading', title: 'Downloading' });
            items.push(...activeRows);
        }
        if (completedRows.length > 0) {
            items.push({ type: 'header', key: 'header-downloaded', title: `Downloaded \u2022 ${completedRows.length} tracks` });
            items.push(...completedRows);
        }
        return items;
    }, [activeRows, completedRows]);

    const isEmpty = activeRows.length === 0 && completedRows.length === 0;

    const subtitle = downloads.formattedSize !== '0 B'
        ? `${downloads.formattedSize} used`
        : !isEmpty
            ? ' '
            : undefined;

    const renderItem = useCallback(({ item }: { item: DownloadRow }) => {
        if (item.type === 'header') {
            return (
                <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} layout={LinearTransition.duration(250)} style={styles.sectionHeader}>
                    <Title size={13} fontFamily="Poppins-SemiBold" color={colors.text[1]}>{item.title}</Title>
                </Animated.View>
            );
        }
        if (item.type === 'active') {
            return (
                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(250)} layout={LinearTransition.duration(250)}>
                    <ActiveDownloadItem
                        progress={item.data}
                        meta={item.meta}
                        onPause={handlePause}
                        onResume={handleResume}
                        onCancel={handleCancelDownload}
                    />
                </Animated.View>
            );
        }
        return (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(250)} layout={LinearTransition.duration(250)}>
                <CompletedDownloadItem
                    trackId={item.data.trackId}
                    track={item.data.originalTrack}
                    fileSize={item.data.fileSize}
                    localArtworkPath={item.data.localArtworkPath}
                    onPlay={handlePlay}
                    onLongPress={handleLongPress}
                />
            </Animated.View>
        );
    }, [handlePause, handleResume, handleCancelDownload, handlePlay, handleLongPress, styles.sectionHeader, colors.text]);

    const keyExtractor = useCallback((item: DownloadRow) => item.key, []);

    const listFooter = useMemo(() =>
        completedRows.length > 0 ? (
            <View style={styles.footer}>
                <Pressable style={styles.deleteAllBtn} onPress={handleDeleteAll}>
                    <IconTrash size={16} color="#ff4d4f" />
                    <Title size={13} color="#ff4d4f" fontFamily="Poppins-Medium">Delete All Downloads</Title>
                </Pressable>
                <View style={{ height: tabsHeight }} />
            </View>
        ) : <View style={{ height: tabsHeight }} />,
        [completedRows.length, styles.footer, styles.deleteAllBtn, handleDeleteAll, tabsHeight]
    );

    return (
        <Container includeBottom={false}>
            <Header title="Downloads" subtitle={subtitle} />
            {isEmpty ? (
                <View style={{ flex: 1, paddingBottom: tabsHeight }}>
                    <FullscreenMessage
                        icon={IconCircleArrowDown}
                        label="No Downloads"
                        description="Download tracks from the library to listen offline"
                    />
                </View>
            ) : (
                <Animated.FlatList
                    data={flatData}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListFooterComponent={listFooter}
                    itemLayoutAnimation={LinearTransition.duration(250)}
                    skipEnteringExitingAnimations
                />
            )}
        </Container>
    );
}
