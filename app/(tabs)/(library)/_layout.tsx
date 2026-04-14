import { Stack } from 'expo-router';

export default function Layout() {
    return (
        <Stack screenOptions={{
            headerShown: false,
        }}>
            <Stack.Screen name="library" />
            <Stack.Screen name="history" />
        </Stack>
    )
}