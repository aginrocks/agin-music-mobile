import Container from '@lib/components/Container';
import Header from '@lib/components/Header';
import Setting, { SettingSelectOption } from '@lib/components/Setting';
import SettingsSection from '@lib/components/SettingsSection';
import { useCache, useMemoryCache } from '@lib/hooks';
import { IconCircleCheck, IconDownload, IconMobiledata, IconWifi } from '@tabler/icons-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';
import showToast from '@lib/showToast';

const qualityLevels: SettingSelectOption[] = [
    { label: 'Normal', description: '128kbps', value: '128kbps' },
    { label: 'High', description: '256kbps', value: '256kbps' },
    { label: 'Lossless', description: 'ALAC, 24-bit/48 kHz', value: 'lossless' },
];

export type SettingId = 'audioQuality.wifi' | 'audioQuality.celluar' | 'audioQuality.download' | 'audioQuality.atmos' | 'storage.clearCache' | 'developer.copyId' | 'ui.toastPosition' | 'ui.autoFocusSearchBar' | 'ui.HideAutoCreatedPlaylist';

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
                    {/* <SettingsSection label='Audio Quality' />
                    <Setting
                        id='audioQuality.wifi'
                        type='select'
                        label='Wi-Fi Streaming'
                        description='Maximum quality on Wi-Fi'
                        icon={IconWifi}
                        options={qualityLevels}
                    />
                    <Setting
                        id='audioQuality.celluar'
                        type='select'
                        label='Cellular Streaming'
                        description='Maximum quality on cellular data'
                        icon={IconMobiledata}
                        options={qualityLevels}
                    />
                    <Setting
                        id='audioQuality.download'
                        type='select'
                        label='Download Quality'
                        description='Maximum quality for downloaded music'
                        icon={IconDownload}
                        options={qualityLevels}
                    />
                    <Setting
                        id='audioQuality.atmos'
                        type='switch'
                        label='Dolby Atmos'
                        description='Enable Dolby Atmos when available'
                    /> */}
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
                    <Setting 
                        id='ui.HideAutoCreatedPlaylist'
                        type='switch'
                        label='Hide root playlist'
                        description='Hide playlists created by root'
                        defaultValue={true}
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
