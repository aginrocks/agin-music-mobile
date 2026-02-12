import { StyledActionSheet } from '@/lib/components/StyledActionSheet';
import { Platform, StyleSheet, View } from 'react-native';
import { SheetProps } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { createContext, useMemo, useState } from 'react';
import { useColors } from '@/lib/hooks/useColors';
import { useQueue } from '@/lib/hooks';
import { useCoverBuilder } from '@/lib/hooks/useCoverBuilder';
import BlurredBackground from '@/lib/components/BlurredBackground';
import { IconCast, IconList, IconMessage, IconRepeatOff } from '@tabler/icons-react-native';
import { showRoutePicker } from 'react-airplay';
import MainTab from './MainTab';
import Tabs, { Tab } from './Tabs';
import Animated from 'react-native-reanimated';
import { enterDown, enterUp, exitDown, exitUp } from './animations';
import Title from '@/lib/components/Title';
import QueueTab from './QueueTab';
import LyricsTab from './LyricsTab';
import { ColorSchemeOverride } from '@lib/providers/ColorSchemeOverride';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@lib/toastConfig';

type GestureEnabledContextType = [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>,
]

export const GestureEnabledContext = createContext<GestureEnabledContextType>([
    true,
    () => { },
]);

export const IdContext = createContext<string>('');

export type TabContextType = {
    tab: string,
    changeTab: (tab: string) => void,
};

export const TabContext = createContext<TabContextType>({
    tab: 'main',
    changeTab: () => { },
});

// TODO: Fix dragging the sheet
function PlaybackSheet({ sheetId, payload }: SheetProps<'playback'>) {
    const insets = useSafeAreaInsets();
    const colors = useColors({ forceTheme: 'dark' });
    const { nowPlaying } = useQueue();
    const cover = useCoverBuilder();
    const isExternalPlaybackAvailable = true;// useExternalPlaybackAvailability();

    const [gestureEnabled, setGestureEnabled] = useState(true);
    const [isAnimated, setIsAnimated] = useState(false);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            padding: 30,
            // justifyContent: 'space-between',
            // flex: 1,
            paddingHorizontal: 0,
            height: '100%',
            paddingBottom: Math.max(30, insets.bottom + 10),
        },
        tab: {
            flex: 1,
        },
        tabContainer: {
            flex: 1,
        }
    }), [insets.bottom]);

    const [currentTab, setCurrentTab] = useState('main');
    const [prevTab, setPrevTab] = useState('main');

    const handleTabChange = (newTab: string) => {
        setPrevTab(currentTab); // Store current tab before updating
        setCurrentTab(newTab);  // Update to new tab
    };

    const tabs = useMemo((): Tab[] => [
        {
            icon: IconMessage,
            value: 'lyrics',
        },
        {
            icon: IconCast,
            value: 'cast',
            onPress: () => showRoutePicker({ prioritizesVideoDevices: false }),
            disabled: !isExternalPlaybackAvailable,
        },
        {
            icon: IconList,
            value: 'queue',
        },
    ], []);

    return (
        <ColorSchemeOverride.Provider value="dark">
            <StyledActionSheet
                gestureEnabled={gestureEnabled}
                fullHeight
                safeAreaInsets={{ ...insets, bottom: 0, }}
                overdrawEnabled={false}
                drawUnderStatusBar
                containerStyle={{ backgroundColor: colors.background, margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}
                openAnimationConfig={{ bounciness: 0 }}
                closeAnimationConfig={{ bounciness: 0 }}
                isModal={Platform.OS == 'android' ? false : true}
                CustomHeaderComponent={<View></View>}
                useBottomSafeAreaPadding={true}
                overlayColor={colors.background}
                defaultOverlayOpacity={1}
                onBeforeShow={() => {
                    setIsAnimated(false);
                    setTimeout(() => {
                        setIsAnimated(true);
                    }, 1000);
                }}
            >
                <GestureEnabledContext.Provider value={[gestureEnabled, setGestureEnabled]}>
                    <IdContext.Provider value={sheetId}>
                        <TabContext.Provider value={{ tab: currentTab, changeTab: handleTabChange }}>
                            <BlurredBackground source={{ uri: cover.generateUrl(nowPlaying.coverArt ?? '') }} cacheKey={nowPlaying.coverArt ? `${nowPlaying.coverArt}-full` : 'empty-full'} animated={isAnimated} />
                            <View style={styles.container}>
                                <View style={styles.tabContainer}>
                                    {currentTab == 'main' && <Animated.View style={styles.tab} exiting={exitUp} entering={enterDown}>
                                        <MainTab />
                                    </Animated.View>}
                                    {currentTab == 'queue' && <Animated.View style={styles.tab} exiting={exitDown} entering={enterUp}>
                                        <QueueTab />
                                    </Animated.View>}
                                    {currentTab == 'lyrics' && <Animated.View style={styles.tab} exiting={exitDown} entering={enterUp}>
                                        <LyricsTab />
                                    </Animated.View>}
                                </View>
                                <Tabs tabs={tabs} active={currentTab} onChange={handleTabChange} />
                            </View>
                        </TabContext.Provider>
                    </IdContext.Provider>
                </GestureEnabledContext.Provider>
                <Toast config={toastConfig} position='top' topOffset={insets.top + 10} />
            </StyledActionSheet>
        </ColorSchemeOverride.Provider>
    );
}

export default PlaybackSheet;