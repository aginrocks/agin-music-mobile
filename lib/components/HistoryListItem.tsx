import { useColors, useCoverBuilder } from '@lib/hooks';
import { PlaybackHistoryRecord } from '@lib/hooks/usePlaybackHistory';
import { formatPlaybackTime } from '@lib/util/historyHelpers';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Cover from './Cover';
import Title from './Title';

export interface HistoryListItemProps {
    record: PlaybackHistoryRecord;
    onPress: (record: PlaybackHistoryRecord) => void;
    onLongPress: (record: PlaybackHistoryRecord) => void;
}

export default React.memo(function HistoryListItem({ record, onPress, onLongPress }: HistoryListItemProps) {
    const colors = useColors();
    const cover = useCoverBuilder();

    const formattedTime = useMemo(() => formatPlaybackTime(record.playedAt), [record.playedAt]);

    const styles = useMemo(() => StyleSheet.create({
        item: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 20,
            overflow: 'hidden',
            gap: 10,
        },
        left: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: 1,
        },
        metadata: {
            flex: 1,
            overflow: 'hidden',
        },
        timestamp: {
            marginTop: 2,
        }
    }), []);

    return (
        <Pressable
            accessible={true}
            accessibilityLabel={`Play ${record.title} by ${record.artist || 'Unknown Artist'}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to play this track, long press for more options"
            onPress={() => onPress(record)}
            onLongPress={() => onLongPress(record)}
        >
            <View style={styles.item}>
                <View style={styles.left}>
                    <Cover
                        source={{ uri: cover.generateUrl(record.coverArt ?? '', { size: 128 }) }}
                        cacheKey={record.coverArt ? `${record.coverArt}-128x128` : 'empty-128x128'}
                        size={50}
                        radius={6}
                        withShadow={false}
                    />
                    <View style={styles.metadata}>
                        <Title size={14} numberOfLines={1}>{record.title}</Title>
                        {record.artist && (
                            <Title size={12} fontFamily="Poppins-Regular" color={colors.text[1]} numberOfLines={1}>
                                {record.artist}
                            </Title>
                        )}
                        <Title size={11} fontFamily="Poppins-Regular" color={colors.text[2]} numberOfLines={1} style={styles.timestamp}>
                            {formattedTime}
                        </Title>
                    </View>
                </View>
            </View>
        </Pressable>
    );
});
