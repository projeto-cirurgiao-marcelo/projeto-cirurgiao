import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';
import useOnboardingStore from '../../src/stores/onboarding-store';
import useAuthStore from '../../src/stores/auth-store';

const PROFESSIONS = [
  'Estudante de Veterinária',
  'Médico(a) Veterinário(a)',
  'Residente',
  'Pós-Graduando(a)',
  'Professor(a)',
  'Outro',
];

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export default function ProfileInfoScreen() {
  const {
    profession,
    state: selectedState,
    city,
    isLoading,
    setProfession,
    setState,
    setCity,
    submitOnboarding,
    skipOnboarding,
  } = useOnboardingStore();

  const [showStates, setShowStates] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);

  const handleComplete = async () => {
    try {
      await submitOnboarding();
      // Atualiza o flag de onboarding no auth store
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        useAuthStore.setState({
          user: { ...authStore.user, onboardingCompleted: true },
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao salvar perfil');
    }
  };

  const handleSkip = async () => {
    try {
      await skipOnboarding();
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        useAuthStore.setState({
          user: { ...authStore.user, onboardingCompleted: true },
        });
      }
      router.replace('/(tabs)');
    } catch {}
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Conte-nos sobre você</Text>
        <Text style={styles.subtitle}>
          Essas informações ajudam a personalizar sua experiência
        </Text>

        {/* Profissão */}
        <Text style={styles.label}>Profissão / Formação</Text>
        <View style={styles.chipsContainer}>
          {PROFESSIONS.map((prof) => {
            const isActive = profession === prof;
            return (
              <TouchableOpacity
                key={prof}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setProfession(prof)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {prof}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Estado */}
        <Text style={styles.label}>Estado</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowStates(!showStates)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.selectButtonText,
              !selectedState && styles.selectButtonPlaceholder,
            ]}
          >
            {selectedState || 'Selecione seu estado'}
          </Text>
          <Ionicons
            name={showStates ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {showStates && (
          <View style={styles.statesGrid}>
            {BRAZILIAN_STATES.map((uf) => {
              const isActive = selectedState === uf;
              return (
                <TouchableOpacity
                  key={uf}
                  style={[styles.stateChip, isActive && styles.chipActive]}
                  onPress={() => {
                    setState(uf);
                    setShowStates(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.stateChipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {uf}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Cidade */}
        <Text style={styles.label}>Cidade</Text>
        <TextInput
          style={[styles.input, cityFocused && styles.inputFocused]}
          placeholder="Digite sua cidade"
          placeholderTextColor={Colors.textMuted}
          value={city || ''}
          onChangeText={setCity}
          onFocus={() => setCityFocused(true)}
          onBlur={() => setCityFocused(false)}
          autoCapitalize="words"
        />

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeButton, isLoading && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>
            {isLoading ? 'Salvando...' : 'Concluir'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  skipText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
    lineHeight: FontSize.sm * 1.5,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  selectButtonText: {
    fontSize: FontSize.base,
    color: Colors.text,
  },
  selectButtonPlaceholder: {
    color: Colors.textMuted,
  },
  statesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  stateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 48,
    alignItems: 'center',
  },
  stateChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  input: {
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.base,
    color: Colors.text,
  },
  inputFocused: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  bottomSpace: {
    height: Spacing['3xl'],
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  completeButton: {
    height: 52,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
