/**
 * Layout raiz do app - Expo Router
 */

import '../src/global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { GamificationCelebrationProvider } from '../src/components/gamification/GamificationCelebrationProvider';

/**
 * Orientacao: portrait-only declarado via app.json ("orientation": "portrait").
 * Unica excecao: VideoPlayer ao entrar em fullscreen chama lockAsync(LANDSCAPE)
 * e lockAsync(PORTRAIT_UP) ao sair. Nenhum lock programatico global aqui.
 */

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course" />
        <Stack.Screen name="courses" />
        <Stack.Screen name="forum" />
      </Stack>
      <GamificationCelebrationProvider />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});