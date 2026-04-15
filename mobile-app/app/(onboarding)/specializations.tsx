import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';
import useOnboardingStore from '../../src/stores/onboarding-store';

const SPECIALIZATIONS = [
  'Cirurgia Geral',
  'Ortopedia',
  'Neurologia',
  'Anestesiologia',
  'Oftalmologia',
  'Dermatologia',
  'Cardiologia',
  'Oncologia',
  'Odontologia Veterinária',
  'Emergência e Terapia Intensiva',
  'Diagnóstico por Imagem',
  'Medicina de Felinos',
  'Medicina de Equinos',
  'Animais Silvestres',
  'Reprodução Animal',
  'Nutrição Animal',
  'Patologia Clínica',
  'Fisioterapia e Reabilitação',
];

export default function SpecializationsScreen() {
  const { specializations, toggleSpecialization, clearSpecializations } =
    useOnboardingStore();

  const handleContinue = () => {
    router.push('/(onboarding)/profile-info');
  };

  const handleSkip = async () => {
    try {
      await useOnboardingStore.getState().skipOnboarding();
      router.replace('/(tabs)');
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Quais suas áreas de interesse?</Text>
        <Text style={styles.subtitle}>
          Selecione as especialidades que mais te interessam
        </Text>

        <View style={styles.chipsContainer}>
          {SPECIALIZATIONS.map((spec) => {
            const isActive = specializations.includes(spec);
            return (
              <TouchableOpacity
                key={spec}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => toggleSpecialization(spec)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {spec}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {specializations.length} selecionada
            {specializations.length !== 1 ? 's' : ''}
          </Text>
          {specializations.length > 0 && (
            <TouchableOpacity onPress={clearSpecializations}>
              <Text style={styles.clearText}>Limpar tudo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            specializations.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={specializations.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
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
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  counterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  clearText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.accent,
  },
  continueButton: {
    height: 52,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
