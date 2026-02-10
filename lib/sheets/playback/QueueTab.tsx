import Queue from '@/lib/components/Queue';
import SmallNowPlaying from './SmallNowPlaying';
import Title from '@lib/components/Title';
import { useColors, useQueue } from '@lib/hooks';
import React, { useContext, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import ActionIcon from '@/lib/components/ActionIcon';
import { IconRepeat, IconRepeatOff, IconRepeatOnce, IconTrash } from '@tabler/icons-react-native';
import { IdContext } from '.';
import { SheetManager } from 'react-native-actions-sheet';
export default function QueueTab() {
    const colors = useColors();
    const queue = useQueue();

    const sheetId = useContext(IdContext);

    const styles = useMemo(() => StyleSheet.create({
        top: {
            paddingHorizontal: 30,
        },
        actionBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        queue: {
            marginTop: 10,
            flex: 1,
        },
    }), []);

    return (
        <>
            <View style={styles.top}>
                <SmallNowPlaying />
                <View style={styles.actionBar}>
                    <View>
                        <Title size={16} fontFamily="Poppins-SemiBold">Queue</Title>
                        <Title size={12} fontFamily="Poppins-Regular" color={colors.text[1]}>{queue.source.sourceName ? `Playing from ${queue.source.sourceName}` : 'Manually Added'}</Title>
                    </View>
                    <View style={styles.actions}>
                        <ActionIcon icon={queue.repeatMode === 'off' ? IconRepeatOff : queue.repeatMode === 'Playlist' ? IconRepeat : IconRepeatOnce} variant={queue.repeatMode !== 'off' ? 'secondaryFilled' : 'secondary'} size={16} onPress={queue.cycleRepeatMode} />
                        <ActionIcon icon={IconTrash} variant='secondary' size={16} onPress={async () => await queue.clearConfirm({ wait: true, onConfirm: () => SheetManager.hide(sheetId) })} />
                    </View>
                </View>
            </View>
            <View style={styles.queue}>
                <Queue />
            </View>
        </>
    )
}