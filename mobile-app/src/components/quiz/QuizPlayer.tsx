import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { quizzesService } from '../../services/api/quizzes.service';
import { logger } from '../../lib/logger';
import { useAuthStore } from '../../stores/auth-store';
import type {
  Quiz,
  QuizAnswerDto,
  QuizResult as QuizResultType,
  QuizStats,
} from '../../types/quiz.types';
import { Colors as colors } from '../../constants/colors';
import { QuizIntro } from './QuizIntro';
import { QuestionCard } from './QuestionCard';
import { QuizResult } from './QuizResult';

export interface QuizPlayerProps {
  videoId: string;
  /** Optional callback for parent to close the surrounding surface (e.g. tab/sheet). */
  onClose?: () => void;
}

type Phase = 'intro' | 'play' | 'result';

/**
 * Top-level orchestrator for the video quiz feature.
 *
 * Owns:
 *   - quiz fetch / generation / submission
 *   - phase machine (intro -> play -> result)
 *   - the answer map & timing for the current attempt
 *
 * Renders one of <QuizIntro />, <QuestionCard /> or <QuizResult /> based on phase.
 *
 * NOTE (Sprint 1 / Task 13): juice components (XpBurst, ConfettiSkia, ScreenShake,
 * ComboMeter, ConfidenceRating) and useQuizStore wiring are intentionally NOT
 * connected here — Task 14 wires them in.
 */
export function QuizPlayer({ videoId, onClose }: QuizPlayerProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';

  const [phase, setPhase] = useState<Phase>('intro');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Play state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // Result state
  const [result, setResult] = useState<QuizResultType | null>(null);

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quizzes = await quizzesService.listByVideo(videoId);

      if (quizzes.length > 0) {
        const quizData = await quizzesService.getById(quizzes[0].id);
        setQuiz(quizData);

        const quizStats = await quizzesService.getStats(quizData.id);
        setStats(quizStats);
      } else {
        setQuiz(null);
        setStats(null);
      }
    } catch (err) {
      logger.error('Erro ao carregar quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true);
      const newQuiz = await quizzesService.generateQuiz(videoId);
      setQuiz(newQuiz);
      setStats(null);
    } catch (error) {
      logger.error('Erro ao gerar quiz:', error);
      Alert.alert('Erro', 'Nao foi possivel gerar o quiz. Verifique se o video possui transcricao.');
    } finally {
      setGenerating(false);
    }
  }, [videoId]);

  const handleStartQuiz = () => {
    if (!quiz) return;
    setPhase('play');
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setSelectedOption(null);
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleSubmit = useCallback(
    async (finalAnswers: Map<string, number>, currentQuiz: Quiz) => {
      try {
        setSubmitting(true);
        const totalTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const answersDto: QuizAnswerDto[] = currentQuiz.questions.map((q) => ({
          questionId: q.id,
          answer: finalAnswers.get(q.id) ?? 0,
        }));

        const quizResult = await quizzesService.submit(currentQuiz.id, {
          answers: answersDto,
          totalTimeSpent,
        });

        setResult(quizResult);
        setPhase('result');

        // Refresh stats
        const newStats = await quizzesService.getStats(currentQuiz.id);
        setStats(newStats);
      } catch (error) {
        logger.error('Erro ao enviar quiz:', error);
        Alert.alert('Erro', 'Nao foi possivel enviar as respostas. Tente novamente.');
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const handleNextQuestion = () => {
    if (!quiz || selectedOption === null) return;

    const question = quiz.questions[currentQuestionIndex];

    const newAnswers = new Map(answers);
    newAnswers.set(question.id, selectedOption);
    setAnswers(newAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      questionStartRef.current = Date.now();
    } else {
      handleSubmit(newAnswers, quiz);
    }
  };

  const resetToIntro = () => {
    setPhase('intro');
    setResult(null);
    setAnswers(new Map());
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
  };

  const handleRetryNewQuiz = useCallback(async () => {
    try {
      setGenerating(true);
      setPhase('intro');
      setResult(null);
      setAnswers(new Map());
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      const newQuiz = await quizzesService.generateQuiz(videoId);
      setQuiz(newQuiz);
      // Refresh stats (mantém histórico de tentativas anteriores)
      if (newQuiz) {
        const newStats = await quizzesService.getStats(newQuiz.id);
        setStats(newStats);
      }
    } catch (error) {
      logger.error('Erro ao gerar novo quiz:', error);
      Alert.alert('Erro', 'Nao foi possivel gerar um novo quiz. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, [videoId]);

  const handleCloseModal = () => {
    if (phase === 'play') {
      Alert.alert('Sair do quiz?', 'Seu progresso sera perdido.', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: resetToIntro },
      ]);
    } else {
      resetToIntro();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando quiz...</Text>
      </View>
    );
  }

  // Fullscreen modal for play + result phases
  const isModalVisible = phase === 'play' || phase === 'result';

  const renderPlayPhase = () => {
    if (!quiz) return null;
    const question = quiz.questions[currentQuestionIndex];
    const isLast = currentQuestionIndex === quiz.questions.length - 1;

    return (
      <View style={styles.fullscreenContainer}>
        {/* Header */}
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            onPress={handleCloseModal}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.fullscreenHeaderTitle}>{quiz.title}</Text>
          <View style={{ width: 32 }} />
        </View>

        <QuestionCard
          question={{
            id: question.id,
            question: question.question,
            options: question.options,
          }}
          selectedAnswer={selectedOption}
          onSelect={handleSelectOption}
          disabled={submitting}
          progress={{
            current: currentQuestionIndex + 1,
            total: quiz.questions.length,
          }}
        />

        {/* Bottom action */}
        <View style={styles.playFooter}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              (selectedOption === null || submitting) && styles.buttonDisabled,
            ]}
            onPress={handleNextQuestion}
            disabled={selectedOption === null || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {isLast ? 'Finalizar' : 'Proxima'}
                </Text>
                <Ionicons
                  name={isLast ? 'checkmark' : 'arrow-forward'}
                  size={16}
                  color="#fff"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResultPhase = () => {
    if (!result) return null;

    return (
      <View style={styles.fullscreenContainer}>
        {/* Header */}
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            onPress={handleCloseModal}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.fullscreenHeaderTitle}>Resultado</Text>
          <View style={{ width: 32 }} />
        </View>

        <QuizResult
          score={result.score}
          correctCount={result.correctCount}
          totalQuestions={result.totalQuestions}
          passed={result.passed}
          answers={result.answers}
          questions={quiz?.questions}
          generating={generating}
          onRetryNewQuiz={handleRetryNewQuiz}
          onClose={handleCloseModal}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Intro stays inline within the tab */}
      {phase === 'intro' && (
        <QuizIntro
          quiz={quiz}
          stats={stats}
          isAdmin={isAdmin}
          generating={generating}
          onGenerate={handleGenerate}
          onStart={handleStartQuiz}
          onRetryNewQuiz={handleRetryNewQuiz}
        />
      )}

      {/* Fullscreen modal for play + result */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
          {phase === 'play' && renderPlayPhase()}
          {phase === 'result' && renderResultPhase()}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default QuizPlayer;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Play footer / next button
  playFooter: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Fullscreen modal chrome
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
