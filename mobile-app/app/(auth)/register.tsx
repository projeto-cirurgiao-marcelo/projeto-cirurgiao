/**
 * Tela de Registro - Referência visual clean com header centralizado
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
import { useAuthStore } from '../../src/stores/auth-store';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Campos obrigatórios',
        text2: 'Preencha todos os campos',
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Senha fraca',
        text2: 'A senha deve ter pelo menos 6 caracteres',
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Senhas não conferem',
        text2: 'Digite a mesma senha nos dois campos',
      });
      return;
    }

    try {
      await register({ name: name.trim(), email: email.trim(), password });
      Toast.show({
        type: 'success',
        text1: 'Conta criada!',
        text2: 'Bem-vindo ao Projeto Cirurgião',
      });
      // Novo usuário sempre vai para onboarding
      router.replace('/(onboarding)/specializations');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao criar conta',
        text2: err.message || 'Tente novamente',
      });
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
            <Text style={styles.welcomeText}>Bem-vindo ao Projeto Cirurgião!</Text>
            <Text style={styles.title}>
              Registre-se para iniciar{'\n'}sua jornada!
            </Text>
          </View>

          {/* Nome completo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'name' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Seu nome completo"
                placeholderTextColor={Colors.inputPlaceholder}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isLoading}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* E-mail */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço de E-mail</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'email' && styles.inputFocused,
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
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'password' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={styles.inputFlex}
                placeholder="Mínimo de 6 caracteres"
                placeholderTextColor={Colors.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
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

          {/* Confirmar Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'confirm' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={styles.inputFlex}
                placeholder="Digite a senha novamente"
                placeholderTextColor={Colors.inputPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão Continuar */}
          <TouchableOpacity
            style={[styles.continueButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>

          {/* Link para login */}
          <View style={styles.linkRow}>
            <Text style={styles.linkText}>Já tem uma conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkBold}>Entrar</Text>
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
    marginBottom: Spacing['3xl'],
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

  // ---- Botão principal ----
  continueButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius['2xl'],
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
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

  // ---- Link para login ----
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
