import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

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

const MONO_FAMILY = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * Pure presentational question card matching Marcelo claude.design styles.css.
 * Eyebrow "PERGUNTA X / N", question h2, options A/B/C/D white cards with
 * monospace badge box. Wrapping screen owns the linear-gradient background.
 */
export function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  disabled = false,
  progress,
}: QuestionCardProps) {
  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.content}>
      {progress && (
        <Text style={styles.eyebrow}>
          PERGUNTA {String(progress.current).padStart(2, '0')} / {String(progress.total).padStart(2, '0')}
        </Text>
      )}

      <Text style={styles.questionText}>{question.question}</Text>

      <View style={styles.optionsList}>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onSelect(index)}
              disabled={disabled}
              activeOpacity={0.85}
            >
              <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text
                style={[styles.optionText, isSelected && styles.optionTextSelected]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default QuestionCard;

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F8AA8',
    letterSpacing: 1.5,
    marginBottom: 8,
    fontFamily: MONO_FAMILY,
  },
  questionText: {
    color: '#0B2845',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#E1EAF3',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionSelected: {
    borderColor: '#1E6FD9',
    backgroundColor: '#F0F7FF',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0F5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: '#1E6FD9',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6F8AA8',
    fontFamily: MONO_FAMILY,
  },
  badgeTextSelected: {
    color: 'white',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0B2845',
    lineHeight: 19,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
