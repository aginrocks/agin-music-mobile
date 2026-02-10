import Container from '@lib/components/Container';
import Header from '@lib/components/Header';
import Setting, { SettingSelectOption } from '@lib/components/Setting';
import SettingsSection from '@lib/components/SettingsSection';
import { useCache, useMemoryCache } from '@lib/hooks';
import { IconCircleCheck, IconDoor, IconFileMusic, IconLayoutGrid, IconVolume } from '@tabler/icons-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';
import showToast from '@lib/showToast';

const maxBitRateOptions: SettingSelectOption[] = [
    { label: 'Original', description: 'No transcoding', value: '0', shortLabel: 'Original' },
    { label: '320 kbps', description: 'Highest quality transcode', value: '320', shortLabel: '320k' },
    { label: '256 kbps', description: 'High quality', value: '256', shortLabel: '256k' },
    { label: '192 kbps', description: 'Good quality', value: '192', shortLabel: '192k' },
    { label: '128 kbps', description: 'Standard quality', value: '128', shortLabel: '128k' },
    { label: '96 kbps', description: 'Low quality', value: '96', shortLabel: '96k' },
    { label: '64 kbps', description: 'Minimum quality', value: '64', shortLabel: '64k' },
];

const formatOptions: SettingSelectOption[] = [
    { label: 'Original', description: 'Server default format', value: 'raw', shortLabel: 'Original' },
    { label: 'MP3', description: 'Most compatible', value: 'mp3', shortLabel: 'MP3' },
    { label: 'Opus', description: 'Modern, efficient codec', value: 'opus', shortLabel: 'Opus' },
    { label: 'AAC', description: 'Good quality, widely supported', value: 'aac', shortLabel: 'AAC' },
    { label: 'OGG Vorbis', description: 'Open source format', value: 'ogg', shortLabel: 'OGG' },
];

const defaultTabOptions: SettingSelectOption[] = [
    { label: 'Home', description: 'Main home screen', value: 'home', shortLabel: 'Home' },
    { label: 'Library', description: 'Your music library', value: 'library', shortLabel: 'Library' },
    { label: 'Downloads', description: 'Downloaded music', value: 'downloads', shortLabel: 'Downloads' },
    { label: 'Search', description: 'Search for music', value: 'search', shortLabel: 'Search' },
];

const defaultLibraryTabOptions: SettingSelectOption[] = [
    { label: 'Playlists', description: 'Your playlists', value: 'playlists', shortLabel: 'Playlists' },
    { label: 'Artists', description: 'Browse by artist', value: 'artists', shortLabel: 'Artists' },
    { label: 'Albums', description: 'Browse by album', value: 'albums', shortLabel: 'Albums' },
    { label: 'Songs', description: 'All songs', value: 'songs', shortLabel: 'Songs' },
];

export type SettingId = 'streaming.maxBitRate' | 'streaming.format' | 'storage.clearCache' | 'developer.copyId' | 'ui.toastPosition' | 'ui.autoFocusSearchBar' | 'app.defaultTab' | 'app.defaultLibraryTab';

export default function Settings() {
    const cache = useCache();
    const memoryCache = useMemoryCache();

    const styles = useMemo(() => StyleSheet.create({
        settings: {
            paddingTop: 10,
        },
        scroll: {
            flex: 1,
        }
    }), []);

    return (
        <Container>
            <Header title="Settings" withBackIcon withAvatar={false} titleSize={20} />
            <ScrollView>
                <View style={styles.settings}>
                    <SettingsSection label='Launch' />
                    <Setting
                        id='app.defaultTab'
                        type='select'
                        label='Default Tab'
                        description='Which tab to open when launching the app'
                        icon={IconDoor}
                        defaultValue='home'
                        options={defaultTabOptions}
                    />
                    <Setting
                        id='app.defaultLibraryTab'
                        type='select'
                        label='Default Library Section'
                        description='Which library section to show by default'
                        icon={IconLayoutGrid}
                        defaultValue='playlists'
                        options={defaultLibraryTabOptions}
                    />
                    <SettingsSection label='Streaming Quality' />
                    <Setting
                        id='streaming.maxBitRate'
                        type='select'
                        label='Max Bitrate'
                        description='Maximum streaming bitrate (requires server transcoding)'
                        icon={IconVolume}
                        defaultValue='0'
                        options={maxBitRateOptions}
                    />
                    <Setting
                        id='streaming.format'
                        type='select'
                        label='Preferred Format'
                        description='Preferred audio format for transcoding'
                        icon={IconFileMusic}
                        defaultValue='raw'
                        options={formatOptions}
                    />
                    <SettingsSection label='Storage' />
                    <Setting
                        id='storage.clearCache'
                        type='button'
                        label='Clear Cache'
                        description='This will not remove downloaded music'
                        onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            const confirmed = await SheetManager.show('confirm', {
                                payload: {
                                    title: 'Clear Cache',
                                    message: 'Are you sure you want to clear the cache? This will not remove downloaded music.',
                                    confirmText: 'Clear',
                                    cancelText: 'Cancel',
                                }
                            });
                            if (!confirmed) return;

                            await cache.clearAll();
                            memoryCache.clear();

                            await showToast({
                                title: 'Cache Cleared',
                                subtitle: 'The cache has been cleared successfully.',
                                icon: IconCircleCheck,
                            });
                        }}
                    />
                    <SettingsSection label='Layout' />
                    <Setting
                        id='ui.toastPosition'
                        type='select'
                        label='Toast Position'
                        description='Change the position of the toast notifications'
                        defaultValue='top'
                        options={[
                            {
                                label: 'Top',
                                value: 'top',
                            },
                            {
                                label: 'Bottom',
                                value: 'bottom',
                            }
                        ]}
                    />
                    <Setting
                        id='ui.autoFocusSearchBar'
                        type='switch'
                        label='Automatically Focus Search Bar'
                        description='Focus the search bar automatically'
                    />
                    <SettingsSection label='Developer Options' />
                    <Setting
                        id='developer.copyId'
                        type='switch'
                        label='Copy ID Option'
                        description='Show the copy ID option across the app'
                    />
                </View>
            </ScrollView>
        </Container>
    )
}