import ActionIcon from '@/lib/components/ActionIcon';
import Container from '@/lib/components/Container';
import Header from '@/lib/components/Header';
import { LibLayout, MediaLibraryLayout } from '@/lib/components/MediaLibraryList';
import TagTabs from '@/lib/components/TagTabs';
import { TTagTab } from '@/lib/components/TagTabs/TagTab';
import { IconDisc, IconLayoutGrid, IconLayoutList, IconMicrophone2, IconMusic, IconPlaylist, IconPlus } from '@tabler/icons-react-native';
import React, { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { AlbumsTab, ArtistsTab, PlaylistsTab, SongsTab } from '@/lib/components/MediaLibrary';
import { SheetManager } from 'react-native-actions-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

const tabs: TTagTab[] = [
    {
        label: 'Playlists',
        id: 'playlists',
        icon: IconPlaylist,
    },
    // {
    //     label: 'Favorite',
    //     id: 'favorite',
    //     icon: IconHeart,
    // },
    {
        label: 'Artists',
        id: 'artists',
        icon: IconMicrophone2,
    },
    {
        label: 'Albums',
        id: 'albums',
        icon: IconDisc,
    },
    {
        label: 'Songs',
        id: 'songs',
        icon: IconMusic,
    }
];

export default function Library() {
    const [tab, setTab] = useState('playlists');
    const [layout, setLayout] = useState<MediaLibraryLayout>('');

    useEffect(() => {
        (async () => {
            const [storedLayout, defaultLibraryTab] = await Promise.all([
                AsyncStorage.getItem('mediaLibrary.layout'),
                AsyncStorage.getItem('settings.app.defaultLibraryTab'),
            ]);
            if (storedLayout) setLayout(storedLayout as MediaLibraryLayout);
            else setLayout('grid');
            if (defaultLibraryTab) {
                const parsed = JSON.parse(defaultLibraryTab);
                if (['playlists', 'artists', 'albums', 'songs'].includes(parsed)) {
                    setTab(parsed);
                }
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            await AsyncStorage.setItem('mediaLibrary.layout', layout);
        })();
    }, [layout]);

    return (
        <Container>
            <Header rightSpacing={0} title="Library" withAvatar rightSection={<>
                {tab == 'playlists' && <ActionIcon size={16} icon={IconPlus} onPress={() => SheetManager.show('newPlaylist')} />}
                <ActionIcon size={16} icon={layout == 'list' ? IconLayoutGrid : IconLayoutList} onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLayout(l => l == 'list' ? 'grid' : 'list');
                }} />
            </>} />
            <TagTabs data={tabs} tab={tab} onChange={setTab} />
            <LibLayout.Provider value={layout}>
                {tab == 'playlists' && <PlaylistsTab />}
                {tab == 'artists' && <ArtistsTab />}
                {tab == 'albums' && <AlbumsTab />}
                {tab == 'songs' && <SongsTab />}
            </LibLayout.Provider>
        </Container>
    )
}