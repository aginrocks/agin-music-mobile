import { Pressable, StyleSheet, View } from 'react-native';
import Title from './Title';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useColors } from '@/lib/hooks/useColors';
import ActionIcon from './ActionIcon';
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerTrackNextFilled } from '@tabler/icons-react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { useCoverBuilder } from '@lib/hooks/useCoverBuilder';
import { useQueue } from '@lib/hooks';
import SkipSwipe from './SkipSwipe';
import { Child } from '@lib/types';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { TrackPlayer, useOnPlaybackStateChange } from 'react-native-nitro-player';

function RenderItem(item: Child) {
    const colors = useColors();
    const cover = useCoverBuilder();
    const { nowPlaying } = useQueue();
    const isEmpty = nowPlaying.id === '';

    const styles = useMemo(() => StyleSheet.create({
        metadata: {
            paddingLeft: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
        },
        image: {
            width: 41,
            height: 41,
            borderRadius: 9,
        },
        textContainer: {
            flex: 1,
            overflow: 'hidden',
        },
        swipeContainer: {
            overflow: 'hidden',
            flex: 1,
        }
    }), [colors.secondaryBackground]);
    return (
        <View style={styles.metadata}>
            <Image
                source={{ uri: cover.generateUrl(item.coverArt ?? '', { size: 128 }), cacheKey: item.coverArt ? `${item.coverArt}-128x128` : 'empty-128x128' }}
                style={styles.image}
                cachePolicy="disk"
            />
            <View style={styles.textContainer}>
                <Title size={14} fontFamily="Poppins-SemiBold" numberOfLines={1}>
                    {isEmpty ? 'Not Playing' : item.title}
                </Title>
                {!isEmpty && (
                    <Title
                        size={12}
                        fontFamily="Poppins-Regular"
                        color={colors.text[1]}
                        numberOfLines={1}
                    >
                        {item.artist}
                    </Title>
                )}
            </View>
        </View>
    )
}

function Overlay({ position }: { position: 'left' | 'right' }) {
    const colors = useColors();
    const styles = useMemo(() => StyleSheet.create({
        overlay: {
            position: 'absolute',
            [position]: 0,
            top: 0,
            bottom: 0,
            width: position == 'left' ? 7 : 15,
        }
    }), [colors, position]);

    return (
        <LinearGradient
            style={styles.overlay}
            colors={position == 'left' ? [colors.secondaryBackground, colors.secondaryBackground + '00'] : [colors.secondaryBackground + '00', colors.secondaryBackground]}
            start={[0, 0]}
            end={[1, 0]}
        />
    )
}

export default function Miniplayer() {
    const colors = useColors();

    const queue = useQueue();
    const { nowPlaying } = queue;

    const { state } = useOnPlaybackStateChange();

    const [carouselWidth, setCarouselWidth] = useState(0);

    const containerRef = useRef<View>(null);

    // useLayoutEffect(() => {
    //     containerRef.current?.measureInWindow((x, y, width) => {
    //         setCarouselWidth(width);
    //     });
    // }, [containerRef.current]);

    const styles = useMemo(() => StyleSheet.create({
        miniplayer: {
            backgroundColor: colors.secondaryBackground,
            marginHorizontal: 15,
            borderRadius: 16,
            height: 55,
            marginBottom: 5,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            // paddingLeft: 7,
            overflow: 'hidden',
        },
        metadata: {
            paddingLeft: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
        },
        image: {
            width: 41,
            height: 41,
            borderRadius: 9,
        },
        textContainer: {
            flex: 1,
            overflow: 'hidden',
        },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 10,
        },
        swipeContainer: {
            overflow: 'hidden',
            flex: 1,
            position: 'relative',
        }
    }), [colors.secondaryBackground]);

    const isEmpty = nowPlaying.id === '';

    return (
        <>
            {!isEmpty && <Animated.View entering={FadeInDown.duration(300).easing(Easing.inOut(Easing.ease))} exiting={FadeOutDown.duration(300).easing(Easing.inOut(Easing.ease))}>
                <Pressable onPress={() => SheetManager.show('playback')} style={styles.miniplayer}>
                    <View style={styles.swipeContainer} onLayout={(event) => {
                        const { x, y, width, height } = event.nativeEvent.layout;
                        setCarouselWidth(width);
                    }}>
                        {carouselWidth != 0 && <SkipSwipe width={carouselWidth} renderItem={RenderItem} />}
                        <Overlay position="left" />
                        <Overlay position="right" />
                    </View>
                    {!isEmpty && (
                        <View style={styles.actions}>
                            <ActionIcon icon={(state === 'paused' || state === 'stopped') ? IconPlayerPlayFilled : IconPlayerPauseFilled} size={24} stroke="transparent" isFilled onPress={() => (state === 'paused' || state === 'stopped') ? TrackPlayer.play() : TrackPlayer.pause()} />
                            <ActionIcon icon={IconPlayerTrackNextFilled} size={18} isFilled onPress={() => queue.skipForward()} disabled={!queue.canGoForward} />
                        </View>
                    )}
                </Pressable>
            </Animated.View>}
        </>
    );
}
