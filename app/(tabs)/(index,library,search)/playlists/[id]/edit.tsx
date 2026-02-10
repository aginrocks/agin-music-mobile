import Container from '@/lib/components/Container';
import Header from '@/lib/components/Header';
import Title from '@/lib/components/Title';
import Cover from '@/lib/components/Cover';
import Button from '@/lib/components/Button';
import { Input } from '@/lib/components/Input';
import { useApi, useColors, useCoverBuilder, useMemoryCache, useTabsHeight } from '@lib/hooks';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import showToast from '@lib/showToast';
import { Child, SearchResult3 } from '@lib/types';
import { IconCircleMinus, IconCirclePlus, IconMenu, IconPlus, IconSearch, IconX } from '@tabler/icons-react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SongEntry = Child & { _key: string };

export default function EditPlaylist() {
    const { id } = useLocalSearchParams();
    const cache = useMemoryCache();
    const cover = useCoverBuilder();
    const colors = useColors();
    const api = useApi();
    const insets = useSafeAreaInsets();
    const [tabsHeight] = useTabsHeight();

    const data = useMemo(() => cache.cache.playlists[id as string], [cache.cache.playlists, id]);
    const keyCounter = useRef(0);

    const assignKeys = useCallback((entries: Child[]): SongEntry[] =>
        entries.map(e => ({ ...e, _key: `k${keyCounter.current++}` })), []);

    const [name, setName] = useState(data?.name ?? '');
    const [songs, setSongs] = useState<SongEntry[]>(() => assignKeys(data?.entry ?? []));
    const [saving, setSaving] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Child[]>([]);
    const [recommendations, setRecommendations] = useState<Child[]>([]);
    const searchRef = useRef<TextInput>(null);
    const initialized = useRef(false);

    useFocusEffect(useCallback(() => {
        if (initialized.current) return;
        cache.refreshPlaylist(id as string).then(() => {
            const fresh = cache.cache.playlists[id as string];
            if (fresh) {
                setName(fresh.name);
                setSongs(assignKeys(fresh.entry ?? []));
                initialized.current = true;
            }
        });
    }, [id]));

    // Search songs via API
    useEffect(() => {
        if (!searching || searchQuery.length < 2 || !api) {
            setSearchResults([]);
            return;
        }
        const timeout = setTimeout(async () => {
            try {
                const res = await api.get('/search3', {
                    params: { query: searchQuery, songCount: 30, albumCount: 0, artistCount: 0 },
                });
                const results = res.data?.['subsonic-response']?.searchResult3 as SearchResult3;
                setSearchResults(results?.song ?? []);
            } catch {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, searching, api]);

    const removeSong = useCallback((index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSongs(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addSongFromSearch = useCallback((song: Child) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSongs(prev => [...prev, { ...song, _key: `k${keyCounter.current++}` }]);
        showToast({
            title: 'Added',
            subtitle: song.title,
            cover: { uri: cover.generateUrl(song.coverArt ?? '', { size: 128 }), cacheKey: `${song.coverArt}-128x128` },
        });
    }, [cover]);

    const openSearch = useCallback(async () => {
        setSearching(true);
        setSearchQuery('');
        setTimeout(() => searchRef.current?.focus(), 100);
        // Fetch random songs as recommendations
        if (api && recommendations.length === 0) {
            try {
                const res = await api.get('/getRandomSongs', { params: { size: 20 } });
                const random = res.data?.['subsonic-response']?.randomSongs?.song as Child[];
                if (random) setRecommendations(random);
            } catch {}
        }
    }, [api, recommendations.length]);

    const closeSearch = useCallback(() => {
        setSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        Keyboard.dismiss();
    }, []);

    const save = useCallback(async () => {
        if (!api || !id) return;
        setSaving(true);
        try {
            // Step 1: Update playlist name
            await api.get('/createPlaylist', {
                params: { playlistId: id, name },
            });

            // Step 2: Get current server state
            const current = await cache.refreshPlaylist(id as string);
            const currentEntries = current?.entry ?? [];

            // Step 3: Remove all existing songs
            if (currentEntries.length > 0) {
                await api.get('/updatePlaylist', {
                    params: {
                        playlistId: id,
                        songIndexToRemove: currentEntries.map((_, i) => i),
                    },
                    paramsSerializer: { indexes: null },
                });
            }

            // Step 4: Add songs back in the new order
            if (songs.length > 0) {
                await api.get('/updatePlaylist', {
                    params: {
                        playlistId: id,
                        songIdToAdd: songs.map(s => s.id),
                    },
                    paramsSerializer: { indexes: null },
                });
            }

            await cache.refreshPlaylist(id as string);
            await cache.refreshPlaylists();

            await showToast({ title: 'Playlist Saved', subtitle: name });
            router.back();
        } catch (error) {
            console.error('Failed to save playlist:', error);
            await showToast({ title: 'Error', subtitle: 'Failed to save playlist changes' });
        }
        setSaving(false);
    }, [api, id, name, songs, cache]);

    const styles = useMemo(() => StyleSheet.create({
        content: {
            flex: 1,
            paddingHorizontal: 20,
        },
        nameSection: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 15,
            marginBottom: 20,
            marginTop: 10,
        },
        nameInput: {
            flex: 1,
        },
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },
        addButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: colors.secondaryBackground,
            borderRadius: 20,
        },
        item: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 6,
            gap: 10,
        },
        itemActive: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 10,
        },
        itemMeta: {
            flex: 1,
            overflow: 'hidden',
        },
        footer: {
            paddingTop: 10,
            paddingBottom: tabsHeight + 10,
            paddingHorizontal: 20,
            gap: 8,
        },
        searchOverlay: {
            flex: 1,
            marginTop: 10,
        },
        searchHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 15,
        },
        searchInput: {
            flex: 1,
        },
        searchItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            gap: 10,
        },
        emptySearch: {
            alignItems: 'center',
            paddingTop: 40,
        },
    }), [colors, tabsHeight]);

    // Search results item
    const renderSearchItem = useCallback(({ item }: { item: Child }) => {
        const alreadyAdded = songs.some(s => s.id === item.id);
        return (
            <TouchableOpacity
                style={styles.searchItem}
                onPress={() => !alreadyAdded && addSongFromSearch(item)}
                activeOpacity={alreadyAdded ? 1 : 0.6}
            >
                <Cover
                    source={{ uri: cover.generateUrl(item.coverArt ?? '', { size: 128 }) }}
                    cacheKey={item.coverArt ? `${item.coverArt}-128x128` : 'empty-128x128'}
                    size={44}
                    radius={6}
                    withShadow={false}
                />
                <View style={styles.itemMeta}>
                    <Title size={14} numberOfLines={1}>{item.title}</Title>
                    <Title size={12} fontFamily="Poppins-Regular" color={colors.text[1]} numberOfLines={1}>{item.artist}</Title>
                </View>
                {alreadyAdded ? (
                    <Title size={12} fontFamily="Poppins-Regular" color={colors.text[2]}>Added</Title>
                ) : (
                    <IconPlus size={20} color={colors.tint} />
                )}
            </TouchableOpacity>
        );
    }, [cover, colors, styles, songs, addSongFromSearch]);

    // Playlist song item with drag handle and remove
    const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<SongEntry>) => {
        const index = getIndex() ?? 0;
        return (
            <View style={[styles.item, isActive && styles.itemActive]}>
                <TouchableOpacity onLongPress={drag} delayLongPress={100}>
                    <IconMenu size={20} color={colors.text[1]} />
                </TouchableOpacity>
                <Cover
                    source={{ uri: cover.generateUrl(item.coverArt ?? '', { size: 128 }) }}
                    cacheKey={item.coverArt ? `${item.coverArt}-128x128` : 'empty-128x128'}
                    size={44}
                    radius={6}
                    withShadow={false}
                />
                <View style={styles.itemMeta}>
                    <Title size={14} numberOfLines={1}>{item.title}</Title>
                    <Title size={12} fontFamily="Poppins-Regular" color={colors.text[1]} numberOfLines={1}>{item.artist}</Title>
                </View>
                <TouchableOpacity onPress={() => removeSong(index)} hitSlop={8}>
                    <IconCircleMinus size={22} color={colors.danger} />
                </TouchableOpacity>
            </View>
        );
    }, [cover, colors, styles, removeSong]);

    return (
        <Container includeBottom={false}>
            <Header
                withBackIcon
                withAvatar={false}
                title="Edit Playlist"
                titleSize={18}
            />
            <View style={styles.content}>
                {!searching ? (
                    <>
                        <View style={styles.nameSection}>
                            <Cover
                                source={{ uri: cover.generateUrl(data?.coverArt ?? '') }}
                                cacheKey={data?.coverArt ? `${data.coverArt}-full` : 'empty-full'}
                                size={80}
                                radius={10}
                                withShadow={false}
                            />
                            <Input
                                placeholder="Playlist name"
                                value={name}
                                onChangeText={setName}
                                style={styles.nameInput}
                            />
                        </View>

                        <View style={styles.sectionHeader}>
                            <Title size={16} fontFamily="Poppins-SemiBold">{songs.length} songs</Title>
                            <TouchableOpacity style={styles.addButton} onPress={openSearch}>
                                <IconCirclePlus size={16} color={colors.tint} />
                                <Title size={13} fontFamily="Poppins-SemiBold" color={colors.tint}>Add Songs</Title>
                            </TouchableOpacity>
                        </View>

                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <DraggableFlatList
                                data={songs}
                                keyExtractor={(item) => item._key}
                                renderItem={renderItem}
                                onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)}
                                onDragEnd={({ data }) => setSongs(data)}
                                animationConfig={{ duration: 150 }}
                                ListFooterComponent={<View style={{ height: 10 }} />}
                            />
                        </GestureHandlerRootView>
                    </>
                ) : (
                    <View style={styles.searchOverlay}>
                        <View style={styles.searchHeader}>
                            <Input
                                ref={searchRef}
                                compact
                                icon={IconSearch}
                                placeholder="Search songs..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={styles.searchInput}
                            />
                            <TouchableOpacity onPress={closeSearch}>
                                <IconX size={22} color={colors.text[1]} />
                            </TouchableOpacity>
                        </View>
                        {searchQuery.length < 2 ? (
                            <>
                                {recommendations.length > 0 && (
                                    <Title size={15} fontFamily="Poppins-SemiBold" style={{ marginBottom: 8 }}>Recommended</Title>
                                )}
                                <FlatList
                                    data={recommendations}
                                    keyExtractor={(item) => `rec-${item.id}`}
                                    renderItem={renderSearchItem}
                                    keyboardShouldPersistTaps="handled"
                                    ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
                                    ListEmptyComponent={
                                        <View style={styles.emptySearch}>
                                            <Title size={14} fontFamily="Poppins-Regular" color={colors.text[1]}>Loading recommendations...</Title>
                                        </View>
                                    }
                                />
                            </>
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.id}
                                renderItem={renderSearchItem}
                                keyboardShouldPersistTaps="handled"
                                ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
                                ListEmptyComponent={
                                    <View style={styles.emptySearch}>
                                        <Title size={14} fontFamily="Poppins-Regular" color={colors.text[1]}>No results found</Title>
                                    </View>
                                }
                            />
                        )}
                    </View>
                )}
            </View>

            {!searching && (
                <View style={styles.footer}>
                    <Button variant="primary" onPress={save} disabled={saving || name.length === 0}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="subtle" onPress={() => router.back()}>Cancel</Button>
                </View>
            )}
        </Container>
    );
}
