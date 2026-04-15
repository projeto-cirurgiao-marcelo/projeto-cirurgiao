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
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    if (!hasHydrated) return;

    const bootstrap = async () => {
      if (isAuthenticated) {
        // Revalida sessão com o backend para obter dados frescos
        try {
          await loadUser();
        } catch {
          // Se falhar, loadUser já limpa a sessão
        }

        // Relê o estado atualizado após loadUser
        const freshUser = useAuthStore.getState().user;
        const stillAuthenticated = useAuthStore.getState().isAuthenticated;

        if (!stillAuthenticated) {
          router.replace('/(auth)/login');
        } else if (freshUser?.onboardingCompleted === false) {
          router.replace('/(onboarding)/specializations');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(auth)/login');
      }
    };

    const timer = setTimeout(bootstrap, 500);
    return () => clearTimeout(timer);
  }, [hasHydrated]);

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
