import ActionIcon from '@/lib/components/ActionIcon';
import Cover from '@/lib/components/Cover';
import Title from '@/lib/components/Title';
import { useColors, useCoverBuilder, useQueue } from '@lib/hooks';
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerTrackNextFilled } from '@tabler/icons-react-native';
import { useContext, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { TabContext } from '.';
import { TrackPlayer, useOnPlaybackStateChange } from 'react-native-nitro-player';

export default function SmallNowPlaying() {
    const queue = useQueue();
    const { nowPlaying } = queue;

    const { tab, changeTab } = useContext(TabContext);

    const cover = useCoverBuilder();
    const colors = useColors();
    const { state } = useOnPlaybackStateChange();

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15,
            overflow: 'hidden',
            gap: 10,
        },
        left: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            overflow: 'hidden',
            flex: 1,
        },
        text: {
            flex: 1,
            overflow: 'hidden',
        },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
    }), []);

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.left} activeOpacity={.8} onPress={() => changeTab('main')}>
                <View style={styles.left}>
                    <Cover source={{ uri: cover.generateUrl(nowPlaying.coverArt ?? '') }} cacheKey={nowPlaying.coverArt ? `${nowPlaying.coverArt}-full` : 'empty-full'} size={70} radius={12} />
                    <View style={styles.text}>
                        <Title size={16} fontFamily="Poppins-Medium" numberOfLines={1}>{nowPlaying.title}</Title>
                        <Title size={14} color={colors.text[1]} fontFamily="Poppins-Regular" numberOfLines={1} style={{ marginRight: 5 }}>{nowPlaying.artist}</Title>
                    </View>
                </View>
            </TouchableOpacity>
            <View style={styles.actions}>
                <ActionIcon icon={(state === 'paused' || state === 'stopped') ? IconPlayerPlayFilled : IconPlayerPauseFilled} size={24} stroke="transparent" isFilled onPress={() => (state === 'paused' || state === 'stopped') ? TrackPlayer.play() : TrackPlayer.pause()} variant="subtleFilled" />
                <ActionIcon icon={IconPlayerTrackNextFilled} size={18} isFilled onPress={() => queue.skipForward()} disabled={!queue.canGoForward} />
            </View>
            {/* <NowPlayingActions /> */}
        </View>
    )
}