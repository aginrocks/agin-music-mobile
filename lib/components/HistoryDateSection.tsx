import { useColors } from '@lib/hooks';
import { PlaybackHistoryRecord } from '@lib/hooks/usePlaybackHistory';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import HistoryListItem from './HistoryListItem';
import Title from './Title';

export interface HistoryDateSectionProps {
    title: string;
    records: PlaybackHistoryRecord[];
    onItemPress: (record: PlaybackHistoryRecord) => void;
    onItemLongPress: (record: PlaybackHistoryRecord) => void;
}

export default React.memo(function HistoryDateSection({ 
    title, 
    records, 
    onItemPress, 
    onItemLongPress 
}: HistoryDateSectionProps) {
    const colors = useColors();

    const styles = useMemo(() => StyleSheet.create({
        section: {
            marginBottom: 10,
        },
        header: {
            paddingHorizontal: 20,
            paddingTop: 15,
            paddingBottom: 10,
        },
    }), []);

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Title size={18} fontFamily="Poppins-SemiBold">{title}</Title>
            </View>
            {records.map((record) => (
                <HistoryListItem
                    key={record.id}
                    record={record}
                    onPress={onItemPress}
                    onLongPress={onItemLongPress}
                />
            ))}
        </View>
    );
});
