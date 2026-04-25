import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors as colors } from '../../constants/colors';

export interface QuestionCardQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface QuestionCardProgress {
  current: number;
  total: number;
}

export interface QuestionCardProps {
  question: QuestionCardQuestion;
  selectedAnswer: number | null;
  onSelect: (idx: number) => void;
  disabled?: boolean;
  progress?: QuestionCardProgress;
}

/**
 * Pure presentational question card.
 * Renders progress bar, question counter, question text and 4 (A/B/C/D-style) options.
 */
export function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  disabled = false,
  progress,
}: QuestionCardProps) {
  const progressPct = progress
    ? (progress.current / progress.total) * 100
    : 0;

  return (
    <View style={styles.container}>
      {progress && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      )}

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
      >
        {progress && (
          <View style={styles.questionHeader}>
            <Text style={styles.questionCounter}>
              Questao {progress.current} de {progress.total}
            </Text>
          </View>
        )}

        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsList}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
                onPress={() => onSelect(index)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.optionCircle,
                    isSelected && styles.optionCircleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionCircleText,
                      isSelected && styles.optionCircleTextSelected,
                    ]}
                  >
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default QuestionCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accent,
  },
  body: {
    flex: 1,
  },
  content: {
    padding: 14,
  },
  questionHeader: {
    marginBottom: 12,
  },
  questionCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
  },
  optionButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}08`,
  },
  optionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCircleSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionCircleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionCircleTextSelected: {
    color: '#fff',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  optionTextSelected: {
    fontWeight: '500',
  },
});
