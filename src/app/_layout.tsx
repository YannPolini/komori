import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeaderBack } from '../components/HeaderBack';
import { deviceRepository } from '../features/library/deviceRepository';
import { LibraryNotice } from '../features/library/LibraryNotice';
import { LibraryProvider } from '../features/library/LibraryProvider';
import { colors } from '../theme';

const repository = deviceRepository('guest');

export default function RootLayout() {
  return (
    <LibraryProvider repository={repository}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerLeft: () => <HeaderBack />,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[id]" options={{ title: '' }} />
        <Stack.Screen name="list/[id]" options={{ title: '' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
      </Stack>
      <LibraryNotice />
    </LibraryProvider>
  );
}
