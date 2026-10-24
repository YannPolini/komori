import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeaderBack } from '../components/HeaderBack';
import { LibraryProvider } from '../features/library/LibraryProvider';
import { createMemoryRepository } from '../features/library/repository';
import { MOCK_PROFILE } from '../mock/profile';
import { colors } from '../theme';

const repository = createMemoryRepository(MOCK_PROFILE);

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
    </LibraryProvider>
  );
}
