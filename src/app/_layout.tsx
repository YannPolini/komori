import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, Text } from 'react-native';
import { colors } from '../theme';

function Logo() {
  return (
    <Pressable
      onPress={() => router.navigate('/')}
      accessibilityRole="button"
      accessibilityLabel="Komori, go to Home"
      style={{ minHeight: 44, justifyContent: 'center', marginLeft: Platform.OS === 'web' ? 16 : 0 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>Komori</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            title: '',
            headerLeft: () => <Logo />,
            headerRight: () => (
              <Link href="/account" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Account"
                  style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="person-circle-outline" size={28} color={colors.text} />
                </Pressable>
              </Link>
            ),
          }}
        />
        <Stack.Screen name="anime/[id]" options={{ title: '' }} />
        <Stack.Screen name="account" options={{ title: 'Account' }} />
      </Stack>
    </>
  );
}
