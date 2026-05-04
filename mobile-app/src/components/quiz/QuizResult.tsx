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
import { CircularProgress } from '../ui/CircularProgress';
import { Colors as colors } from '../../constants/colors';
import type { QuizQuestion, QuizResultAnswer } from '../../types/quiz.types';

export interface QuizResultProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: QuizResultAnswer[];
  /** Original quiz questions, used to render the review section. */
  questions?: QuizQuestion[];
  generating?: boolean;
  onRetryNewQuiz: () => void;
  onClose: () => void;
}

/**
 * Pure presentational result phase.
 * Renders score, pass/fail badge, per-question review with explanations,
 * and CTAs for retrying with a new AI-generated quiz or going back.
 */
export function QuizResult({
  score,
  correctCount,
  totalQuestions,
  passed,
  answers,
  questions,
  generating = false,
  onRetryNewQuiz,
  onClose,
}: QuizResultProps) {
  const scoreColor = passed ? colors.success : colors.danger;

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.content}>
      <View style={styles.resultCard}>
        <CircularProgress
          percentage={score}
          size={100}
          strokeWidth={8}
          color={scoreColor}
          labelColor={scoreColor}
        />

        <View
          style={[
            styles.resultBadge,
            { backgroundColor: passed ? `${colors.success}15` : `${colors.danger}15` },
          ]}
        >
          <Ionicons
            name={passed ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={scoreColor}
          />
          <Text style={[styles.resultBadgeText, { color: scoreColor }]}>
            {passed ? 'Aprovado!' : 'Reprovado'}
          </Text>
        </View>

        <Text style={styles.resultSummary}>
          {correctCount} de {totalQuestions} corretas
        </Text>
      </View>

      <Text style={styles.reviewTitle}>Revisao das questoes</Text>
      {answers.map((answer, index) => {
        const question = questions?.find((q) => q.id === answer.questionId);
        return (
          <View
            key={answer.questionId}
            style={[
              styles.reviewCard,
              {
                borderLeftColor: answer.isCorrect ? colors.success : colors.danger,
                borderLeftWidth: 3,
              },
            ]}
          >
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewQuestionNum}>Questao {index + 1}</Text>
              <Ionicons
                name={answer.isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={answer.isCorrect ? colors.success : colors.danger}
              />
            </View>
            {question && (
              <Text style={styles.reviewQuestionText}>{question.question}</Text>
            )}
            {!answer.isCorrect && question && (
              <View style={styles.reviewAnswers}>
                <Text style={styles.reviewWrong}>
                  Sua resposta: {question.options[answer.userAnswer]}
                </Text>
                <Text style={styles.reviewCorrect}>
                  Correta: {question.options[answer.correctAnswer]}
                </Text>
              </View>
            )}
            {answer.explanation && (
              <Text style={styles.reviewExplanation}>{answer.explanation}</Text>
            )}
          </View>
        );
      })}

      <View style={styles.resultActions}>
        <TouchableOpacity
          style={[styles.startButton, generating && styles.buttonDisabled]}
          onPress={onRetryNewQuiz}
          disabled={generating}
          activeOpacity={0.8}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={styles.buttonText}>Novo Quiz</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={16} color={colors.accent} />
          <Text style={styles.retryButtonText}>Voltar para a aula</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default QuizResult;

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 32,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultSummary: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewQuestionNum: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  reviewQuestionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 6,
  },
  reviewAnswers: {
    gap: 2,
    marginBottom: 6,
  },
  reviewWrong: {
    fontSize: 12,
    color: colors.danger,
  },
  reviewCorrect: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  reviewExplanation: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    fontStyle: 'italic',
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
  },
  resultActions: {
    marginTop: 8,
    gap: 10,
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
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.accent}12`,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
