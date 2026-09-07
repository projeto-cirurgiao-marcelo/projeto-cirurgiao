/**
 * Layout raiz do app - Expo Router
 */

import '../src/global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { GamificationCelebrationProvider } from '../src/components/gamification/GamificationCelebrationProvider';
import { initSentry } from '../src/config/sentry';
import useAuthStore from '../src/stores/auth-store';

// Error tracking — no-op sem EXPO_PUBLIC_SENTRY_DSN. Uma vez, no load do módulo.
initSentry();

/**
 * Orientacao: portrait-only declarado via app.json ("orientation": "portrait").
 * Unica excecao: VideoPlayer ao entrar em fullscreen chama lockAsync(LANDSCAPE)
 * e lockAsync(PORTRAIT_UP) ao sair. Nenhum lock programatico global aqui.
 */

export default function RootLayout() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    let active = true;
    void useAuthStore.getState().loadUser().catch(() => {}).finally(() => {
      if (active) setSessionReady(true);
    });
    return () => { active = false; };
  }, [hasHydrated]);

  if (!sessionReady) {
    return <View style={[styles.container, styles.loading]}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      {/* `dark` = ícones escuros. Fixo, não "auto": o app é light-only por
          design, e o `auto` resolve pelo tema do SISTEMA — com o aparelho em
          dark mode ele pintava os ícones de branco sobre o nosso fundo claro,
          deixando hora/bateria/sinal ilegíveis (bug R7 do smoke Android). */}
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="help" />
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="course" />
          <Stack.Screen name="courses" />
          <Stack.Screen name="forum" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
      </Stack>
      {isAuthenticated && <GamificationCelebrationProvider />}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
