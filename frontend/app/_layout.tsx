import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AppState, View, useColorScheme } from 'react-native';
import { useAuthStore } from '../store/auth';
import { useTemaStore } from '../store/tema';
import { useDilStore } from '../store/dil';

// ── Auth routing kontrolü ──────────────────────────────────────────────────
function AuthKontrol() {
  const { token, yuklendi } = useAuthStore();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!yuklendi) return;
    const authGrubu = segments[0] === 'auth';
    if (!token && !authGrubu) router.replace('/auth/giris');
    else if (token && authGrubu) router.replace('/(tabs)');
  }, [token, yuklendi, segments]);

  return null;
}

// ── Arka plan blur overlay ─────────────────────────────────────────────────
// Uygulama switcher'da ekran içeriğini gizler (hassas veri koruması)
function ArkaplanBlur() {
  const [arkaplan, setArkaplan] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setArkaplan(state === 'background' || state === 'inactive');
    });
    return () => sub.remove();
  }, []);

  if (!arkaplan) return null;
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000', zIndex: 9999,
    }} />
  );
}

// ── Root layout ────────────────────────────────────────────────────────────
export default function RootLayout() {
  const { tokenYukle } = useAuthStore();
  const { temaYukle }  = useTemaStore();
  const { dilYukle }   = useDilStore();
  const colorScheme    = useColorScheme();

  useEffect(() => {
    tokenYukle();
    dilYukle();
    temaYukle(colorScheme === 'dark');
  }, []);

  return (
    <>
      <AuthKontrol />
      <ArkaplanBlur />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="legal" />
      </Stack>
    </>
  );
}
