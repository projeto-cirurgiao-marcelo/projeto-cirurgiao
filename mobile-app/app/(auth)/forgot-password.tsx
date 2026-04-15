/**
 * Tela de Recuperação de Senha - Referência visual clean com header centralizado
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';
import useAuthStore from '../../src/stores/auth-store';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const { resetPassword } = useAuthStore();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Campo obrigatório',
        text2: 'Digite seu e-mail',
      });
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setEmailSent(true);
      Toast.show({
        type: 'success',
        text1: 'E-mail enviado!',
        text2: 'Verifique sua caixa de entrada',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: err.message || 'Tente novamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Tela de sucesso ----
  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          {/* Botão voltar */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.successCenter}>
            <View style={styles.successIconCircle}>
              <Ionicons name="mail-outline" size={40} color={Colors.accent} />
            </View>
            <Text style={styles.successTitle}>E-mail enviado!</Text>
            <Text style={styles.successText}>
              Enviamos um link de recuperação para{' '}
              <Text style={styles.successEmail}>{email}</Text>. Verifique sua
              caixa de entrada e siga as instruções para redefinir sua senha.
            </Text>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Voltar para login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEmailSent(false)}>
              <Text style={styles.resendText}>
                Não recebeu o e-mail? Enviar novamente
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Tela de formulário ----
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
          {/* Botão voltar */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Header centralizado */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Esqueceu a senha?</Text>
            <Text style={styles.title}>
              Vamos te ajudar{'\n'}a recuperar!
            </Text>
          </View>

          <Text style={styles.description}>
            Digite seu e-mail cadastrado e enviaremos um link para redefinir sua
            senha.
          </Text>

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

          {/* Botão Enviar */}
          <TouchableOpacity
            style={[styles.continueButton, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.continueButtonText}>
                Enviar link de recuperação
              </Text>
            )}
          </TouchableOpacity>

          {/* Voltar para login */}
          <TouchableOpacity
            style={styles.backToLoginRow}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={16} color={Colors.accent} />
            <Text style={styles.backToLoginText}>Voltar para login</Text>
          </TouchableOpacity>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },

  // ---- Botão voltar ----
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  // ---- Header centralizado ----
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
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
  description: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: FontSize.base * 1.6,
    marginBottom: Spacing['3xl'],
    textAlign: 'center',
  },

  // ---- Input ----
  inputGroup: {
    marginBottom: Spacing['2xl'],
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

  // ---- Botão principal ----
  continueButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius['2xl'],
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
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

  // ---- Voltar para login ----
  backToLoginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  backToLoginText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },

  // ---- Tela de sucesso ----
  successContent: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
  },
  successCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing['6xl'],
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  successTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  successText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: FontSize.base * 1.6,
    marginBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
  },
  successEmail: {
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  resendText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.lg,
  },
});
