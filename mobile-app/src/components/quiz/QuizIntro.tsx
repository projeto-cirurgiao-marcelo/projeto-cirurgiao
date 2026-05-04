import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors as colors } from '../../constants/colors';
import type { Quiz, QuizStats } from '../../types/quiz.types';

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  EASY: { label: 'Facil', color: colors.success, bg: `${colors.success}15` },
  MEDIUM: { label: 'Medio', color: colors.warning, bg: `${colors.warning}15` },
  HARD: { label: 'Dificil', color: colors.danger, bg: `${colors.danger}15` },
};

export interface QuizIntroProps {
  quiz: Quiz | null;
  stats: QuizStats | null;
  isAdmin: boolean;
  generating: boolean;
  /** Optional status label shown next to the spinner during async generation. */
  generationStatus?: string | null;
  onGenerate: () => void;
  onStart: () => void;
  onRetryNewQuiz: () => void;
}

/**
 * Pure presentational intro phase.
 * Shows either:
 *   - empty state with "generate quiz with AI" CTA, when no quiz exists
 *   - full intro card with quiz metadata + previous stats + start CTA
 */
export function QuizIntro({
  quiz,
  stats,
  isAdmin,
  generating,
  generationStatus,
  onGenerate,
  onStart,
  onRetryNewQuiz,
}: QuizIntroProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!quiz ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="school-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Teste seus conhecimentos</Text>
          <Text style={styles.emptyText}>
            {isAdmin
              ? 'Gere um quiz com IA baseado no conteudo desta aula.'
              : 'Gere um quiz personalizado com IA para praticar o que aprendeu nesta aula. Cada quiz e unico!'}
          </Text>
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.buttonDisabled]}
            onPress={onGenerate}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>
                  {generationStatus ?? 'Gerando…'}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.buttonText}>Gerar Quiz com IA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.introCard}>
          <View style={styles.introHeader}>
            <Ionicons name="school" size={16} color={colors.accent} />
            <Text style={styles.introHeaderTitle}>Quiz</Text>
          </View>
          <Text style={styles.introTitle}>{quiz.title}</Text>
          {quiz.description && (
            <Text style={styles.introDescription}>{quiz.description}</Text>
          )}
          <View style={styles.introMeta}>
            {(() => {
              const config = DIFFICULTY_CONFIG[quiz.difficulty] || DIFFICULTY_CONFIG.MEDIUM;
              return (
                <View style={[styles.introBadge, { backgroundColor: config.bg }]}>
                  <Ionicons name="speedometer-outline" size={12} color={config.color} />
                  <Text style={[styles.introBadgeText, { color: config.color }]}>
                    {config.label}
                  </Text>
                </View>
              );
            })()}
            <View style={styles.introBadge}>
              <Ionicons name="help-circle-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.introBadgeText}>{quiz.questions?.length ?? 0} questoes</Text>
            </View>
            {quiz.timeLimit && (
              <View style={styles.introBadge}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.introBadgeText}>
                  {Math.round(quiz.timeLimit / 60)} min
                </Text>
              </View>
            )}
            <View style={styles.introBadge}>
              <Ionicons name="checkmark-done-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.introBadgeText}>Min: {quiz.passingScore}%</Text>
            </View>
          </View>

          {stats && stats.totalAttempts > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Seu desempenho</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalAttempts}</Text>
                  <Text style={styles.statLabel}>Tentativas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: stats.passed ? colors.success : colors.danger },
                    ]}
                  >
                    {Math.round(stats.bestScore)}%
                  </Text>
                  <Text style={styles.statLabel}>Melhor nota</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(stats.averageScore)}%</Text>
                  <Text style={styles.statLabel}>Media</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.startButton, generating && styles.buttonDisabled]}
            onPress={onStart}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>
                  {generationStatus ?? 'Gerando…'}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.buttonText}>Iniciar Quiz</Text>
              </>
            )}
          </TouchableOpacity>
          {stats && stats.totalAttempts > 0 && (
            <TouchableOpacity
              style={[styles.regenerateButton, generating && styles.buttonDisabled]}
              onPress={onRetryNewQuiz}
              disabled={generating}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={14} color={colors.accent} />
              <Text style={styles.regenerateButtonText}>Gerar Novo Quiz</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

export default QuizIntro;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 12,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },

  // Intro card
  introCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  introHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  introDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  introMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  introBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  introBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Stats
  statsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
  },
  regenerateButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  // Shared
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
