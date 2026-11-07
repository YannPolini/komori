import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { HeaderBack } from '../components/HeaderBack';
import { ScreenState } from '../components/ScreenState';
import { AuthProvider, useAuth } from '../features/account/AuthProvider';
import { accountOwner } from '../features/account/client';
import { deviceRepository } from '../features/library/deviceRepository';
import { LibraryNotice } from '../features/library/LibraryNotice';
import { LibraryProvider } from '../features/library/LibraryProvider';
import { colors } from '../theme';

function AccountLibrary() {
  const auth = useAuth();
  const owner = auth.identity ? accountOwner(auth.identity.id) : 'guest';
  const repository = useMemo(() => deviceRepository(owner), [owner]);
  if (auth.status === 'loading') return <ScreenState kind="loading" />;
  if (auth.status === 'error') {
    return <ScreenState kind="error" message="Your session could not be restored." onRetry={auth.retry} />;
  }
  return (
    <LibraryProvider key={owner} repository={repository}>
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

export default function RootLayout() {
  return <AuthProvider><AccountLibrary /></AuthProvider>;
}
