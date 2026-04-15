import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { quizzesService } from '../../services/api/quizzes.service';
import { CircularProgress } from '../ui/CircularProgress';
import { useAuthStore } from '../../stores/auth-store';
import type {
  Quiz,
  QuizQuestion,
  QuizAnswerDto,
  QuizResult,
  QuizStats,
} from '../../types/quiz.types';
import { Colors as colors } from '../../constants/colors';

interface VideoQuizProps {
  videoId: string;
}

type Phase = 'intro' | 'play' | 'result';

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  EASY: { label: 'Facil', color: colors.success, bg: `${colors.success}15` },
  MEDIUM: { label: 'Medio', color: colors.warning, bg: `${colors.warning}15` },
  HARD: { label: 'Dificil', color: colors.danger, bg: `${colors.danger}15` },
};

export function VideoQuiz({ videoId }: VideoQuizProps) {
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
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    loadQuiz();
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
      console.error('Erro ao carregar quiz:', err);
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
      console.error('Erro ao gerar quiz:', error);
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

  const handleNextQuestion = () => {
    if (!quiz || selectedOption === null) return;

    const question = quiz.questions[currentQuestionIndex];
    const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);

    const newAnswers = new Map(answers);
    newAnswers.set(question.id, selectedOption);
    setAnswers(newAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      questionStartRef.current = Date.now();
    } else {
      handleSubmit(newAnswers);
    }
  };

  const handleSubmit = useCallback(
    async (finalAnswers: Map<string, number>) => {
      if (!quiz) return;

      try {
        setSubmitting(true);
        const totalTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const answersDto: QuizAnswerDto[] = quiz.questions.map((q) => ({
          questionId: q.id,
          answer: finalAnswers.get(q.id) ?? 0,
        }));

        const quizResult = await quizzesService.submit(quiz.id, {
          answers: answersDto,
          totalTimeSpent,
        });

        setResult(quizResult);
        setPhase('result');

        // Refresh stats
        const newStats = await quizzesService.getStats(quiz.id);
        setStats(newStats);
      } catch (error) {
        console.error('Erro ao enviar quiz:', error);
        Alert.alert('Erro', 'Nao foi possivel enviar as respostas. Tente novamente.');
      } finally {
        setSubmitting(false);
      }
    },
    [quiz]
  );

  const handleRetry = () => {
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
      console.error('Erro ao gerar novo quiz:', error);
      Alert.alert('Erro', 'Nao foi possivel gerar um novo quiz. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }, [videoId]);

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

  const handleCloseModal = () => {
    if (phase === 'play') {
      Alert.alert('Sair do quiz?', 'Seu progresso sera perdido.', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: handleRetry },
      ]);
    } else {
      handleRetry();
    }
  };

  const renderPlayPhase = () => {
    if (!quiz) return null;
    const question = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
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

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <ScrollView
          style={styles.fullscreenBody}
          contentContainerStyle={styles.playContent}
        >
          {/* Question header */}
          <View style={styles.questionHeader}>
            <Text style={styles.questionCounter}>
              Questao {currentQuestionIndex + 1} de {quiz.questions.length}
            </Text>
          </View>

          {/* Question text */}
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Options */}
          <View style={styles.optionsList}>
            {question.options.map((option, index) => {
              const isSelected = selectedOption === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleSelectOption(index)}
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
    const scoreColor = result.passed ? colors.success : colors.danger;

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

        <ScrollView
          style={styles.fullscreenBody}
          contentContainerStyle={styles.resultContent}
        >
          {/* Score card */}
          <View style={styles.resultCard}>
            <CircularProgress
              percentage={result.score}
              size={100}
              strokeWidth={8}
              color={scoreColor}
              labelColor={scoreColor}
            />

            <View
              style={[
                styles.resultBadge,
                { backgroundColor: result.passed ? `${colors.success}15` : `${colors.danger}15` },
              ]}
            >
              <Ionicons
                name={result.passed ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={scoreColor}
              />
              <Text style={[styles.resultBadgeText, { color: scoreColor }]}>
                {result.passed ? 'Aprovado!' : 'Reprovado'}
              </Text>
            </View>

            <Text style={styles.resultSummary}>
              {result.correctCount} de {result.totalQuestions} corretas
            </Text>
          </View>

          {/* Answers review */}
          <Text style={styles.reviewTitle}>Revisao das questoes</Text>
          {result.answers.map((answer, index) => {
            const question = quiz?.questions.find((q) => q.id === answer.questionId);
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

          {/* Actions */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={[styles.startButton, generating && styles.buttonDisabled]}
              onPress={handleRetryNewQuiz}
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
              onPress={handleCloseModal}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color={colors.accent} />
              <Text style={styles.retryButtonText}>Voltar para a aula</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Intro stays inline within the tab */}
      {phase === 'intro' && (
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
                onPress={handleGenerate}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#fff" />
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
                  <Text style={styles.introBadgeText}>{quiz.questions.length} questoes</Text>
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
                      <Text style={[styles.statValue, { color: stats.passed ? colors.success : colors.danger }]}>
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
                onPress={stats && stats.totalAttempts > 0 ? handleRetryNewQuiz : handleStartQuiz}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={stats && stats.totalAttempts > 0 ? 'sparkles' : 'play'}
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.buttonText}>
                      {stats && stats.totalAttempts > 0 ? 'Novo Quiz' : 'Iniciar Quiz'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 12,
  },
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

  // Intro
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

  // Play
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accent,
  },
  playContent: {
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

  // Shared
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Result
  resultContent: {
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

  // Fullscreen modal
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
  fullscreenBody: {
    flex: 1,
  },
});

export default VideoQuiz;
