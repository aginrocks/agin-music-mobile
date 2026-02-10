import Container from '@lib/components/Container';
import Header from '@lib/components/Header';
import Setting, { SettingSelectOption } from '@lib/components/Setting';
import SettingsSection from '@lib/components/SettingsSection';
import Title from '@lib/components/Title';
import { useCache, useColors, useMemoryCache } from '@lib/hooks';
import { IconCircleCheck, IconDoor, IconFileMusic, IconLayoutGrid, IconVolume } from '@tabler/icons-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import * as Haptics from 'expo-haptics';
import showToast from '@lib/showToast';
import { useEqualizer } from 'react-native-nitro-player';

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

export type SettingId = 'streaming.maxBitRate' | 'streaming.format' | 'storage.clearCache' | 'developer.copyId' | 'ui.toastPosition' | 'ui.autoFocusSearchBar' | 'app.defaultTab' | 'app.defaultLibraryTab' | 'eq.enabled';

const EQ_PRESETS: Record<string, number[]> = {
    Flat:      [0, 0, 0, 0, 0],
    Rock:      [4, 2, -1, 3, 5],
    Pop:       [-1, 2, 4, 2, -1],
    Jazz:      [3, 1, -1, 1, 3],
    Classical: [3, 1, -2, 1, 4],
};

const EQ_BAND_LABELS = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

function EQBandSlider({ label, gain, onGainChange, colors }: { label: string; gain: number; onGainChange: (value: number) => void; colors: any }) {
    const steps = 24; // -12 to +12
    const percentage = ((gain + 12) / 24) * 100;

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 10 }}>
            <Title size={11} fontFamily="Poppins-Medium" style={{ width: 45 }}>{label}</Title>
            <View style={{ flex: 1, height: 28, justifyContent: 'center' }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border[0], overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors.forcedTint, borderRadius: 2 }} />
                </View>
                <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
                    {Array.from({ length: 5 }, (_, i) => {
                        const val = -12 + (i * 6);
                        return (
                            <Pressable key={i} onPress={() => onGainChange(val)} hitSlop={8} style={{ width: 20, alignItems: 'center' }}>
                                <View style={{ width: 1, height: 8, backgroundColor: colors.text[2] + '40' }} />
                            </Pressable>
                        );
                    })}
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable onPress={() => onGainChange(Math.max(-12, gain - 1))} hitSlop={6} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border[0], alignItems: 'center', justifyContent: 'center' }}>
                    <Title size={14} fontFamily="Poppins-Bold">-</Title>
                </Pressable>
                <View style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <Title size={11} fontFamily="Poppins-SemiBold">{gain > 0 ? `+${gain}` : `${gain}`}</Title>
                </View>
                <Pressable onPress={() => onGainChange(Math.min(12, gain + 1))} hitSlop={6} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border[0], alignItems: 'center', justifyContent: 'center' }}>
                    <Title size={14} fontFamily="Poppins-Bold">+</Title>
                </Pressable>
            </View>
        </View>
    );
}

function EQSection() {
    const colors = useColors();
    const eq = useEqualizer();
    const [activePreset, setActivePreset] = useState<string | null>(eq.currentPreset);

    const handlePreset = useCallback((name: string) => {
        const gains = EQ_PRESETS[name];
        eq.setAllBandGains(gains);
        setActivePreset(name);
        Haptics.selectionAsync();
    }, [eq]);

    const handleBandChange = useCallback((index: number, gain: number) => {
        eq.setBandGain(index, gain);
        setActivePreset(null);
        Haptics.selectionAsync();
    }, [eq]);

    const handleToggle = useCallback((enabled: boolean) => {
        eq.setEnabled(enabled);
        Haptics.selectionAsync();
    }, [eq]);

    const handleReset = useCallback(() => {
        eq.reset();
        setActivePreset('Flat');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [eq]);

    return (
        <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }}>
                <View>
                    <Title size={14}>Equalizer</Title>
                    <Title size={12} color={colors.text[1]} fontFamily="Poppins-Regular">Adjust audio frequencies</Title>
                </View>
                <Switch
                    trackColor={{ false: colors.segmentedControlBackground, true: colors.forcedTint }}
                    thumbColor={colors.text[0]}
                    ios_backgroundColor={colors.segmentedControlBackground}
                    value={eq.isEnabled}
                    onValueChange={handleToggle}
                />
            </View>
            {eq.isEnabled && (
                <>
                    <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 8, flexWrap: 'wrap' }}>
                        {Object.keys(EQ_PRESETS).map(name => (
                            <Pressable
                                key={name}
                                onPress={() => handlePreset(name)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 6,
                                    borderRadius: 16,
                                    backgroundColor: activePreset === name ? colors.forcedTint : colors.border[0],
                                }}
                            >
                                <Title size={12} fontFamily="Poppins-Medium" color={activePreset === name ? '#fff' : colors.text[0]}>{name}</Title>
                            </Pressable>
                        ))}
                        <Pressable
                            onPress={handleReset}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 6,
                                borderRadius: 16,
                                backgroundColor: colors.border[0],
                            }}
                        >
                            <Title size={12} fontFamily="Poppins-Medium" color={colors.text[1]}>Reset</Title>
                        </Pressable>
                    </View>
                    {eq.bands.map((band, index) => (
                        <EQBandSlider
                            key={index}
                            label={EQ_BAND_LABELS[index]}
                            gain={band.gain}
                            onGainChange={(value) => handleBandChange(index, value)}
                            colors={colors}
                        />
                    ))}
                </>
            )}
        </>
    );
}

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
                    <SettingsSection label='Equalizer' />
                    <EQSection />
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