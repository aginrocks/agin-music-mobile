import Container from '@lib/components/Container';
import FullscreenMessage from '@lib/components/FullscreenMessage';
import Header from '@lib/components/Header';
import HistoryDateSection from '@lib/components/HistoryDateSection';
import { usePlaybackHistory, PlaybackHistoryRecord } from '@lib/hooks/usePlaybackHistory';
import { useQueue, useTabsHeight } from '@lib/hooks';
import { groupHistoryByDate } from '@lib/util/historyHelpers';
import { IconHistory } from '@tabler/icons-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';

type HistorySection = {
    title: string;
    data: PlaybackHistoryRecord[];
};

export default function HistoryScreen() {
    const [tabsHeight] = useTabsHeight();
    const { fetchHistory } = usePlaybackHistory();
    const queue = useQueue();

    const [records, setRecords] = useState<PlaybackHistoryRecord[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadHistory = useCallback(async (offset: number = 0, append: boolean = false) => {
        if (loading) return;
        setLoading(true);

        try {
            const newRecords = await fetchHistory(offset, 50);
            
            if (append) {
                setRecords(prev => [...prev, ...newRecords]);
            } else {
                setRecords(newRecords);
            }

            setHasMore(newRecords.length === 50);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchHistory, loading]);

    useEffect(() => {
        loadHistory();
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadHistory(0, false);
        setRefreshing(false);
    }, [loadHistory]);

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore && records.length > 0) {
            loadHistory(records.length, true);
        }
    }, [loading, hasMore, records.length, loadHistory]);

    const handleItemPress = useCallback(async (record: PlaybackHistoryRecord) => {
        await queue.playTrackNow(record.trackId);
    }, [queue]);

    const handleItemLongPress = useCallback((record: PlaybackHistoryRecord) => {
        Haptics.selectionAsync();
        SheetManager.show('track', {
            payload: {
                id: record.trackId,
                context: 'history',
            }
        });
    }, []);

    const sections = useMemo((): HistorySection[] => {
        const grouped = groupHistoryByDate(records);
        const result: HistorySection[] = [];

        if (grouped.today.length > 0) {
            result.push({ title: 'Today', data: grouped.today });
        }
        if (grouped.yesterday.length > 0) {
            result.push({ title: 'Yesterday', data: grouped.yesterday });
        }
        if (grouped.thisWeek.length > 0) {
            result.push({ title: 'This Week', data: grouped.thisWeek });
        }
        if (grouped.earlier.length > 0) {
            result.push({ title: 'Earlier', data: grouped.earlier });
        }

        return result;
    }, [records]);

    const renderSection = useCallback(({ section }: { section: HistorySection }) => (
        <HistoryDateSection
            title={section.title}
            records={section.data}
            onItemPress={handleItemPress}
            onItemLongPress={handleItemLongPress}
        />
    ), [handleItemPress, handleItemLongPress]);

    const keyExtractor = useCallback((item: PlaybackHistoryRecord) => item.id.toString(), []);

    const listFooter = useMemo(() => (
        <View style={{ height: tabsHeight }} />
    ), [tabsHeight]);

    const isEmpty = records.length === 0 && !loading;

    return (
        <Container includeBottom={false}>
            <Header title="Playback History" />
            {isEmpty ? (
                <View style={{ flex: 1, paddingBottom: tabsHeight }}>
                    <FullscreenMessage
                        icon={IconHistory}
                        label="No playback history yet"
                        description="Tracks you listen to will appear here"
                    />
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    renderItem={() => null}
                    renderSectionHeader={renderSection}
                    keyExtractor={keyExtractor}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={listFooter}
                />
            )}
        </Container>
    );
}
