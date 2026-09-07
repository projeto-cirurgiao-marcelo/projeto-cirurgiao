import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

// Keep the shipped /register deep link without offering public registration.
export default function RegisterScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcomeText}>Projeto Cirurgião</Text>
        <Text style={styles.title}>Acesso por convite</Text>
        <Text style={styles.description}>
          O acesso ao Projeto Cirurgião é liberado por convite. Não é possível
          criar uma conta pelo aplicativo.
        </Text>
        <Text style={styles.description}>
          Se você já recebeu acesso, entre com os dados da sua conta. Caso ainda
          não tenha recebido seu convite, entre em contato com a equipe do Projeto
          Cirurgião.
        </Text>
        <TouchableOpacity
          style={styles.button}
          accessibilityRole="button"
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Ir para login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['4xl'],
  },
  welcomeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius['2xl'],
    minHeight: 52,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});
