import Container from '@/lib/components/Container';
import Header from '@/lib/components/Header';
import { PlaylistHeader } from '@lib/components/Playlist';
import { useCoverBuilder, useMemoryCache, useQueue, useTabsHeight } from '@lib/hooks';
import ActionIcon from '@lib/components/ActionIcon';
import { LibSize, LibLayout, LibSeparators } from '@lib/components/MediaLibraryList';
import MediaLibItem from '@lib/components/MediaLibraryList/Item';
import { IconDots, IconSearch } from '@tabler/icons-react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedRef, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Child } from '@lib/types';

export default function Playlist() {
    const { id } = useLocalSearchParams();

    const cache = useMemoryCache();
    const cover = useCoverBuilder();
    const queue = useQueue();
    const [tabsHeight] = useTabsHeight();
    const listRef = useAnimatedRef<FlatList>();

    const data = useMemo(() => cache.cache.playlists[id as string], [cache.cache.playlists, id]);

    const entryData = useMemo(() => data?.entry, [data?.entry]);

    const containerOpacity = useSharedValue(0);

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
    }));

    useEffect(() => {
        if (!data) return;
        containerOpacity.value = withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) });
    }, [data]);

    useFocusEffect(useCallback(() => {
        cache.refreshPlaylist(id as string);
    }, [cache.refreshPlaylist, id]));

    const showContextMenu = useCallback(async () => {
        Haptics.selectionAsync();
        SheetManager.show('playlist', {
            payload: {
                id: data.id,
                data,
                context: 'playlist',
            }
        });
    }, [data]);

    const renderItem = useCallback(({ item, index }: { item: Child, index: number }) => (
        <MediaLibItem
            key={item.id}
            id={item.id}
            title={item.title}
            subtitle={item.artist}
            coverUri={cover.generateUrl(item.coverArt ?? '', { size: 128 })}
            coverCacheKey={`${item.coverArt}-128x128`}
            rightSection={<>
                <ActionIcon icon={IconDots} size={16} variant='secondaryTransparent' onPress={() => {
                    Haptics.selectionAsync();
                    SheetManager.show('track', {
                        payload: {
                            id: item.id,
                            data: item,
                            context: 'playlist',
                            contextId: data.id,
                        }
                    });
                }} />
            </>}
            onPress={() => {
                if (!data.entry) return;
                queue.replace(data.entry, {
                    initialIndex: data.entry.findIndex(x => x.id === item.id),
                    source: { source: 'playlist', sourceId: data.id, sourceName: data.name },
                });
            }}
        />
    ), [data?.entry]);

    return (
        <Container includeTop={false} includeBottom={false}>
            <Header
                withBackIcon
                withAvatar={false}
                floating
                scrollRef={listRef}
                interpolationRange={[200, 350]}
                title={data?.name}
                titleSize={18}
                initialHideTitle
                rightSection={<>
                    {/* TODO */}
                    {/* <ActionIcon icon={IconSearch} size={16} variant='secondary' /> */}
                    <ActionIcon icon={IconDots} size={16} variant='secondary' onPress={showContextMenu} />
                </>} />
            <Animated.View style={[{ flex: 1 }, containerStyle]}>
                <LibLayout.Provider value="list">
                    <LibSize.Provider value="medium">
                        <LibSeparators.Provider value={false}>
                            <FlatList
                                data={entryData}
                                keyExtractor={(item) => item.id ?? `fallback-${Math.random()}`}
                                ref={listRef}
                                // windowSize={5}
                                // getItemCount={() => entryData?.length ?? 0}
                                getItemLayout={(data, index) => ({ length: 62, offset: 62 * index, index })}
                                renderItem={renderItem}
                                ListHeaderComponent={<PlaylistHeader playlist={data} onTitlePress={showContextMenu} />}
                                ListFooterComponent={<View style={{ height: tabsHeight + 10 }} />}
                            />
                        </LibSeparators.Provider>
                    </LibSize.Provider>
                </LibLayout.Provider>
            </Animated.View>
        </Container>
    )
}