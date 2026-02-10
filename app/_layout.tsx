import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/lib/hooks/useColorScheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetProvider } from 'react-native-actions-sheet';
import '@/lib/sheets';
import ServerProvider from '@/lib/providers/ServerProvider';
import { SQLiteProvider } from 'expo-sqlite';
import initDatabase from '@/lib/initDatabase';
import QueueProvider from '@/lib/providers/QueueProvider';
import MemoryCacheProvider from '@/lib/providers/MemoryCacheProvider';
import { configureReanimatedLogger, ReanimatedLogLevel, } from 'react-native-reanimated';
import { useSetupPlayer } from '@lib/hooks';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import TabsHeightProvider from '@lib/providers/TabsHeightProvider';
import Toast from 'react-native-toast-message';
import { toastConfig } from '@lib/toastConfig';
import ToastWrapper from '@lib/components/ToastWrapper';
import SearchHistoryProvider from '@lib/providers/SearchHistoryProvider';
import PinsProvider from '@lib/providers/PinsProvider';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from '@lib/widget-task-handler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 300,
  fade: true,
});

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

registerWidgetTaskHandler(widgetTaskHandler);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    'Poppins-Black': require('../assets/fonts/Poppins/Poppins-Black.ttf'),
    'Poppins-BlackItalic': require('../assets/fonts/Poppins/Poppins-BlackItalic.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
    'Poppins-BoldItalic': require('../assets/fonts/Poppins/Poppins-BoldItalic.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins/Poppins-ExtraBold.ttf'),
    'Poppins-ExtraBoldItalic': require('../assets/fonts/Poppins/Poppins-ExtraBoldItalic.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins/Poppins-ExtraLight.ttf'),
    'Poppins-ExtraLightItalic': require('../assets/fonts/Poppins/Poppins-ExtraLightItalic.ttf'),
    'Poppins-Italic': require('../assets/fonts/Poppins/Poppins-Italic.ttf'),
    'Poppins-LightItalic': require('../assets/fonts/Poppins/Poppins-LightItalic.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
    'Poppins-MediumItalic': require('../assets/fonts/Poppins/Poppins-MediumItalic.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    'Poppins-SemiBoldItalic': require('../assets/fonts/Poppins/Poppins-SemiBoldItalic.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins/Poppins-Thin.ttf'),
    'Poppins-ThinItalic': require('../assets/fonts/Poppins/Poppins-ThinItalic.ttf'),
  });

  useSetupPlayer({});

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SQLiteProvider databaseName="cache.db" onInit={initDatabase}>
          <TabsHeightProvider>
            <ServerProvider>
              <SearchHistoryProvider>
                <QueueProvider>
                  <MemoryCacheProvider>
                    <PinsProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <SheetProvider>
                          <Stack>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="+not-found" />
                            <Stack.Screen name="login" options={{ headerShown: false }} />
                            <Stack.Screen name="login-password" options={{ headerShown: false }} />
                          </Stack>
                          <ToastWrapper />
                          <StatusBar style="auto" />
                        </SheetProvider>
                      </GestureHandlerRootView>
                    </PinsProvider>
                  </MemoryCacheProvider>
                </QueueProvider>
              </SearchHistoryProvider>
            </ServerProvider>
          </TabsHeightProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
