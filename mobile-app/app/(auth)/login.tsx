/**
 * Tela de Login - Referência visual clean com header centralizado
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import useAuthStore from '../../src/stores/auth-store';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || error?.message || '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password'))
    return 'E-mail ou senha incorretos.';
  if (code.includes('auth/user-not-found'))
    return 'Nenhuma conta encontrada com este e-mail.';
  if (code.includes('auth/too-many-requests'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (code.includes('auth/user-disabled'))
    return 'Esta conta foi desativada. Entre em contato com o suporte.';
  if (code.includes('auth/network-request-failed'))
    return 'Sem conexão com a internet. Verifique sua rede.';
  if (code.includes('auth/invalid-email'))
    return 'O endereço de e-mail é inválido.';
  return 'Não foi possível fazer login. Tente novamente.';
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Campos obrigatórios', text2: 'Preencha e-mail e senha.' });
      return;
    }

    try {
      await login({ email, password });
      const user = useAuthStore.getState().user;
      if (user?.onboardingCompleted === false) {
        router.replace('/(onboarding)/specializations');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro no login', text2: getFirebaseErrorMessage(err) });
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header centralizado */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Bem-vindo ao Projeto Cirurgião!</Text>
            <Text style={styles.title}>
              Entre para continuar{'\n'}sua jornada!
            </Text>
          </View>

          {/* E-mail */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço de E-mail</Text>
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={Colors.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputFocused,
              ]}
            >
              <TextInput
                style={styles.inputFlex}
                placeholder="••••••"
                placeholderTextColor={Colors.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Esqueceu a senha */}
          <View style={styles.forgotRow}>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Botão Continuar */}
          <TouchableOpacity
            style={[styles.continueButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>

          {/* Link para registro */}
          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Não tem uma conta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkBold}>Criar conta</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['4xl'],
  },

  // ---- Header centralizado ----
  header: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
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
    lineHeight: FontSize['2xl'] * 1.4,
    textAlign: 'center',
  },

  // ---- Inputs ----
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 52,
    backgroundColor: Colors.white,
  },
  inputFocused: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.inputText,
    height: '100%',
  },
  inputFlex: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.inputText,
    height: '100%',
  },

  // ---- Esqueceu a senha ----
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing['2xl'],
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },

  // ---- Botão principal ----
  continueButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius['2xl'],
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },

  // ---- Link para registro ----
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  linkText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  linkBold: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.bold,
  },

});
