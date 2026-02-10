import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import React, { useEffect, useRef, useState } from 'react';
import { useColorScheme } from '@/lib/hooks/useColorScheme';
import { TabBar } from '@/lib/components/TabBar';
import { TabButton } from '@/lib/components/TabBar/TabButton';
import { IconCircleArrowDown, IconHome, IconLayoutGrid, IconSearch } from '@tabler/icons-react-native';
import { useColors, useServer } from '@lib/hooks';
import { Redirect, router } from 'expo-router';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const tabRoutes: Record<string, string> = {
  home: '/',
  library: '/library',
  downloads: '/downloads',
  search: '/search',
};

export default function TabLayout() {
  const colors = useColors();
  const { server, isLoading } = useServer();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading || hasNavigated.current) return;
    if (server.url === '' || server.auth.username === '') return;
    hasNavigated.current = true;

    (async () => {
      const defaultTab = await AsyncStorage.getItem('settings.app.defaultTab');
      const parsed = defaultTab ? JSON.parse(defaultTab) : null;
      if (parsed && parsed !== 'home' && tabRoutes[parsed]) {
        // Delay to ensure the tab navigator is fully mounted
        requestAnimationFrame(() => {
          setTimeout(() => {
            router.navigate(tabRoutes[parsed] as any);
          }, 0);
        });
      }
    })();
  }, [isLoading, server.url, server.auth.username]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}></View>
  }

  if (server.url === '' || server.auth.username === '') {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <Tabs>
        <TabSlot />
        <TabList asChild>
          <TabBar>
            <TabTrigger name="home" href="/" style={{ flex: 1 }} asChild>
              <TabButton
                icon={IconHome}
                label='Home'
              />
            </TabTrigger>
            <TabTrigger name="library" href="/library" style={{ flex: 1 }} asChild>
              <TabButton
                icon={IconLayoutGrid}
                label='Library'
              />
            </TabTrigger>
            <TabTrigger name="downloads" href="/downloads" style={{ flex: 1 }} asChild>
              <TabButton
                icon={IconCircleArrowDown}
                label='Downloads'
              />
            </TabTrigger>
            <TabTrigger name="search" href="/search" style={{ flex: 1 }} asChild>
              <TabButton
                icon={IconSearch}
                label='Search'
              />
            </TabTrigger>
          </TabBar>
        </TabList>
      </Tabs>
      {/* <Miniplayer /> */}
      {/* <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
          animation: 'shift',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconHome color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color }) => <IconLayoutGrid color={color} />,
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Downloads',
            tabBarIcon: ({ color }) => <IconCircleArrowDown color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <IconSearch color={color} />,
          }}
        />
      </Tabs> */}
    </>
  );
}
