/**
 * Tela inicial - Splash / Roteamento inteligente
 * Aguarda hidratação do auth store e redireciona:
 * - Se não autenticado → login
 * - Se autenticado + onboarding pendente → onboarding
 * - Se autenticado + onboarding completo → tabs (home)
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import useAuthStore from '../src/stores/auth-store';
import { Colors } from '../src/constants/colors';

export default function IndexScreen() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hasHydrated) return;

    // The root layout resolves Firebase before mounting any route, including deep links.
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (user?.onboardingCompleted === false) {
      router.replace('/(onboarding)/specializations');
    } else {
      router.replace('/(tabs)');
    }
  }, [hasHydrated, isAuthenticated, user?.onboardingCompleted]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎓</Text>
      <Text style={styles.title}>Projeto Cirurgião</Text>
      <ActivityIndicator
        size="small"
        color={Colors.accent}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  loader: {
    marginTop: 8,
  },
});
