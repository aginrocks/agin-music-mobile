import Container from "@lib/components/Container";
import FullscreenMessage from "@lib/components/FullscreenMessage";
import Header from "@lib/components/Header";
import Title from "@lib/components/Title";
import Cover from "@lib/components/Cover";
import ActionIcon from "@lib/components/ActionIcon";
import { useColors, useCoverBuilder, useDownloads, useQueue, useTabsHeight } from "@lib/hooks";
import { IconCircleArrowDown, IconPlayerPause, IconPlayerPlay, IconTrash, IconX } from "@tabler/icons-react-native";
import { useCallback, useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
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

type ActiveDownloadRow = { type: 'active'; data: DownloadProgress; meta?: Child };
type CompletedDownloadRow = { type: 'completed'; data: DownloadedTrack };
type DownloadRow = ActiveDownloadRow | CompletedDownloadRow;

function ActiveDownloadItem({ item, colors, downloads }: { item: ActiveDownloadRow; colors: any; downloads: ReturnType<typeof useDownloads> }) {
    const cover = useCoverBuilder();
    const percentage = Math.round(item.data.progress * 100);
    const meta = item.meta;
    const coverArt = meta?.coverArt;
    const isPaused = item.data.state === 'paused';

    const statusText = item.data.state === 'pending'
        ? 'Waiting...'
        : isPaused
            ? `Paused \u2022 ${percentage}%`
            : percentage >= 100
                ? 'Finalizing...'
                : `${percentage}% \u2022 ${formatBytes(item.data.bytesDownloaded)} / ${formatBytes(item.data.totalBytes)}`;

    const handlePauseResume = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            if (isPaused) {
                await downloads.resumeDownload(item.data.downloadId);
            } else {
                await downloads.pauseDownload(item.data.downloadId);
            }
        } catch {
            return;
        }
    }, [isPaused, downloads, item.data.downloadId]);

    const handleCancel = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await downloads.cancelDownload(item.data.downloadId);
        } catch {
            return;
        }
    }, [downloads, item.data.downloadId]);

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
                    <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: isPaused ? colors.text[1] : colors.forcedTint, borderRadius: 2 }} />
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
}

function CompletedDownloadItem({ item, colors, onPlay, onLongPress }: {
    item: CompletedDownloadRow;
    colors: any;
    onPlay: () => void;
    onLongPress: () => void;
}) {
    const cover = useCoverBuilder();
    const track = item.data.originalTrack;
    const coverArt = (track.extraPayload as any)?._child?.coverArt ?? '';

    return (
        <Pressable
            onPress={onPlay}
            onLongPress={onLongPress}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 }}
        >
            <Cover
                source={coverArt ? { uri: cover.generateUrl(coverArt, { size: 128 }) } : undefined}
                cacheKey={coverArt ? `${coverArt}-128x128` : undefined}
                size={44}
                radius={6}
                withShadow={false}
            />
            <View style={{ flex: 1 }}>
                <Title size={14} numberOfLines={1}>{track.title}</Title>
                <Title size={12} color={colors.text[1]} fontFamily="Poppins-Regular" numberOfLines={1}>
                    {track.artist} {item.data.fileSize > 0 ? `\u2022 ${formatBytes(item.data.fileSize)}` : ''}
                </Title>
            </View>
        </Pressable>
    );
}

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
        storageText: {
            paddingHorizontal: 20,
            paddingBottom: 8,
        }
    }), [colors]);

    const activeRows: ActiveDownloadRow[] = downloads.activeDownloads.map(p => ({
        type: 'active' as const,
        data: p,
        meta: downloads.getDownloadingMeta(p.trackId),
    }));

    const completedRows: CompletedDownloadRow[] = downloads.downloadedTracks.map(t => ({
        type: 'completed' as const,
        data: t,
    }));

    const sections = [];
    if (activeRows.length > 0) {
        sections.push({ title: 'Downloading', data: activeRows as DownloadRow[] });
    }
    if (completedRows.length > 0) {
        sections.push({ title: `Downloaded \u2022 ${completedRows.length} tracks`, data: completedRows as DownloadRow[] });
    }

    const isEmpty = activeRows.length === 0 && completedRows.length === 0;

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

    const subtitle = downloads.formattedSize !== '0 B' ? `${downloads.formattedSize} used` : undefined;

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
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.type === 'active' ? `active-${item.data.trackId}` : `dl-${item.data.trackId}`}
                    renderSectionHeader={({ section }) => (
                        <View style={styles.sectionHeader}>
                            <Title size={13} fontFamily="Poppins-SemiBold" color={colors.text[1]}>{section.title}</Title>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        if (item.type === 'active') {
                            return <ActiveDownloadItem item={item} colors={colors} downloads={downloads} />;
                        }
                        return (
                            <CompletedDownloadItem
                                item={item}
                                colors={colors}
                                onPlay={() => handlePlay(item.data.trackId)}
                                onLongPress={() => handleLongPress(item.data.trackId)}
                            />
                        );
                    }}
                    ListFooterComponent={
                        completedRows.length > 0 ? (
                            <View style={styles.footer}>
                                <Pressable style={styles.deleteAllBtn} onPress={handleDeleteAll}>
                                    <IconTrash size={16} color="#ff4d4f" />
                                    <Title size={13} color="#ff4d4f" fontFamily="Poppins-Medium">Delete All Downloads</Title>
                                </Pressable>
                                <View style={{ height: tabsHeight }} />
                            </View>
                        ) : <View style={{ height: tabsHeight }} />
                    }
                    stickySectionHeadersEnabled={false}
                />
            )}
        </Container>
    );
}
