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
import { LinearGradient } from 'expo-linear-gradient';
import { quizzesService } from '../../services/api/quizzes.service';
import { logger } from '../../lib/logger';
import { useAuthStore } from '../../stores/auth-store';
import { useQuizStore } from '../../stores/quiz-store';
import { useHaptic } from '../../hooks/useHaptic';
import { useSound } from '../../hooks/useSound';
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
import { ComboMeter } from './ComboMeter';
import { type ConfidenceLevel } from './ConfidenceRating';
import { XpBurst } from '../juice/XpBurst';
import { ConfettiSkia } from '../juice/ConfettiSkia';
import { ScreenShake } from '../juice/ScreenShake';
import {
  GelpiCelebrateModal,
  type GelpiCelebrateKind,
} from '../juice/GelpiCelebrateModal';

export interface QuizPlayerProps {
  videoId: string;
  /** Optional callback for parent to close the surrounding surface (e.g. tab/sheet). */
  onClose?: () => void;
}

type Phase = 'intro' | 'play' | 'result';
type PlayStep = 'answering' | 'awaitingConfidence';

/**
 * Top-level orchestrator for the video quiz feature.
 *
 * Owns:
 *   - quiz fetch / generation / submission
 *   - phase machine (intro -> play -> result)
 *   - sub-machine inside play: answering -> awaitingConfidence -> next
 *   - the answer map & timing for the current attempt
 *   - juice (XpBurst, Confetti, ScreenShake), haptic + sound triggers
 *
 * Combo state lives in `useQuizStore` so the ComboMeter HUD can subscribe
 * directly without prop-drilling.
 *
 * Server is the source of truth for correctness. Per-question check via
 * `quizzesService.checkAnswer` (returns { isCorrect } without exposing the
 * gabarito). GelpiCelebrateModal (Dr. Gelpi DOM + bottom card) and juice (XpBurst / combo / shake)
 * fire based on the real result. Final aggregate score still comes from
 * submit, but the per-question feedback now matches the truth.
 *
 * Fallback: if checkAnswer throws (network), we assume correct optimistically
 * to avoid punishing the user for backend hiccups.
 */
export function QuizPlayer({ videoId, onClose }: QuizPlayerProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR';

  const haptic = useHaptic();
  const sound = useSound();

  const {
    combo,
    markCorrectness,
    selectAnswer: storeSelectAnswer,
    setConfidence: storeSetConfidence,
    startQuiz: storeStartQuiz,
    reset: storeReset,
  } = useQuizStore();
  const storeAnswers = useQuizStore((s) => s.answers);

  // Accuracy parcial até a pergunta atual (corretas / respondidas com isCorrect set)
  // + total de corretas pra alimentar XP bar do header gamificado.
  const { accuracyPct, correctCount } = (() => {
    let correct = 0;
    let answered = 0;
    for (const a of storeAnswers.values()) {
      if (a.isCorrect !== undefined) {
        answered += 1;
        if (a.isCorrect) correct += 1;
      }
    }
    return {
      accuracyPct: answered === 0 ? 0 : (correct / answered) * 100,
      correctCount: correct,
    };
  })();

  const [phase, setPhase] = useState<Phase>('intro');
  const [playStep, setPlayStep] = useState<PlayStep>('answering');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Play state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [confidences, setConfidences] = useState<Map<string, ConfidenceLevel>>(
    new Map(),
  );
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedConfidence, setSelectedConfidence] =
    useState<ConfidenceLevel | undefined>(undefined);
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // Juice state
  const [xpBurstVisible, setXpBurstVisible] = useState(false);
  const [xpBurstValue, setXpBurstValue] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [lottieKind, setLottieKind] = useState<GelpiCelebrateKind | null>(null);

  // Result state
  const [result, setResult] = useState<QuizResultType | null>(null);

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Cleanup combo store on unmount
  useEffect(() => {
    return () => {
      storeReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quizzes = await quizzesService.listByVideo(videoId);

      if (quizzes.length > 0) {
        const quizData = await quizzesService.getById(quizzes[0].id);
        setQuiz(quizData);

        const quizStats = await quizzesService.getVideoStats(videoId);
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

  const mapJobStatusToLabel = (status: string): string => {
    switch (status) {
      case 'queued':
        return 'Aguardando processamento…';
      case 'active':
        return 'Gerando questões com IA…';
      case 'completed':
        return 'Concluído!';
      case 'failed':
        return 'Falhou';
      default:
        return 'Gerando…';
    }
  };

  const handleGenerate = useCallback(async () => {
    try {
      setGenerating(true);
      setGenerationStatus('Iniciando…');
      const newQuiz = await quizzesService.generateQuizAsync(
        videoId,
        undefined,
        (status) => setGenerationStatus(mapJobStatusToLabel(status)),
      );
      setQuiz(newQuiz);
      setStats(null);
      setGenerationStatus(null);
    } catch (error) {
      logger.error('Erro ao gerar quiz:', error);
      Alert.alert('Erro', 'Nao foi possivel gerar o quiz. Verifique se o video possui transcricao.');
      setGenerationStatus(null);
    } finally {
      setGenerating(false);
    }
  }, [videoId]);

  const resetPlayState = () => {
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setConfidences(new Map());
    setSelectedOption(null);
    setSelectedConfidence(undefined);
    setPlayStep('answering');
    setXpBurstVisible(false);
    setXpBurstValue(0);
    setConfettiActive(false);
    setShakeTrigger(0);
    setLottieKind(null);
  };

  const handleStartQuiz = () => {
    if (!quiz) return;
    setPhase('play');
    resetPlayState();
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
    storeStartQuiz(quiz.id, quiz.questions);
  };

  /**
   * Tap on an option in the answering substate.
   * Calls server-side `checkAnswer` (returns only { isCorrect }, no gabarito)
   * to drive GelpiCelebrateModal + juice. Falls back to optimistic-positive on
   * network failure so a backend hiccup doesn't punish the user.
   */
  const handleSelectOption = async (optionIndex: number) => {
    if (playStep !== 'answering' || !quiz) return;
    setSelectedOption(optionIndex);

    const question = quiz.questions[currentQuestionIndex];
    storeSelectAnswer(question.id, optionIndex);

    // Server-side correctness check (no gabarito exposure).
    let isCorrect = false;
    try {
      const resp = await quizzesService.checkAnswer(
        quiz.id,
        question.id,
        optionIndex,
      );
      isCorrect = resp.isCorrect;
    } catch (err) {
      logger.error(
        '[QuizPlayer] checkAnswer failed; assuming correct optimistically',
        err,
      );
      // Network failure: fall back to optimistic-positive (don't punish user
      // for backend hiccups).
      isCorrect = true;
    }

    markCorrectness(question.id, isCorrect);
    setLottieKind(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      // combo BEFORE the markCorrectness call was `combo`; after the call it
      // becomes combo+1. Read the post-update value via the store directly.
      const newCombo = useQuizStore.getState().combo;
      haptic.fire('correct');
      sound.play('correct');

      // Combo-tier pulse every 3 hits.
      if (newCombo >= 3 && newCombo % 3 === 0) {
        haptic.fire('comboTier');
        sound.play('combo');
      }

      // Simplified XP estimate: base 15 + 2 per combo step.
      const xpEstimate = 15 + Math.max(0, newCombo - 1) * 2;
      setXpBurstValue(xpEstimate);
      setXpBurstVisible(true);
    } else {
      haptic.fire('wrong');
      sound.play('wrong');
      setShakeTrigger((t) => t + 1);
    }

    // Advance to confidence rating substate.
    setPlayStep('awaitingConfidence');
  };

  const handleSubmit = useCallback(
    async (
      finalAnswers: Map<string, number>,
      finalConfidences: Map<string, ConfidenceLevel>,
      currentQuiz: Quiz,
    ) => {
      try {
        setSubmitting(true);
        const totalTimeSpent = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );

        const answersDto: QuizAnswerDto[] = currentQuiz.questions.map((q) => {
          const dto: QuizAnswerDto = {
            questionId: q.id,
            answer: finalAnswers.get(q.id) ?? 0,
          };
          const conf = finalConfidences.get(q.id);
          if (conf) dto.confidence = conf;
          return dto;
        });

        const quizResult = await quizzesService.submit(currentQuiz.id, {
          answers: answersDto,
          totalTimeSpent,
        });

        setResult(quizResult);
        setPhase('result');

        // Result-phase juice
        if (quizResult.passed) {
          setConfettiActive(true);
          haptic.fire('levelup');
          sound.play('levelup');
          setTimeout(() => setConfettiActive(false), 3000);
        }

        // Refresh stats
        const newStats = await quizzesService.getVideoStats(videoId);
        setStats(newStats);
      } catch (error) {
        logger.error('Erro ao enviar quiz:', error);
        Alert.alert('Erro', 'Nao foi possivel enviar as respostas. Tente novamente.');
      } finally {
        setSubmitting(false);
      }
    },
    [haptic, sound],
  );

  /**
   * Confidence tapped INSIDE the celebrate modal — store level locally and in
   * the quiz-store, but do NOT advance. User clicks "Continuar →" to advance.
   */
  const handleConfidenceTap = (level: ConfidenceLevel) => {
    if (!quiz || selectedOption === null) return;
    const question = quiz.questions[currentQuestionIndex];
    setSelectedConfidence(level);
    storeSetConfidence(question.id, level);
  };

  /**
   * "Continuar →" tapped in the modal — commit answer + confidence, close
   * the modal, advance to next question or submit if we're on the last one.
   */
  const handleContinue = () => {
    if (!quiz || selectedOption === null || !selectedConfidence) return;
    const question = quiz.questions[currentQuestionIndex];

    const newAnswers = new Map(answers);
    newAnswers.set(question.id, selectedOption);
    setAnswers(newAnswers);

    const newConfidences = new Map(confidences);
    newConfidences.set(question.id, selectedConfidence);
    setConfidences(newConfidences);

    setLottieKind(null);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setSelectedConfidence(undefined);
      setPlayStep('answering');
      setXpBurstVisible(false);
      questionStartRef.current = Date.now();
    } else {
      handleSubmit(newAnswers, newConfidences, quiz);
    }
  };

  const resetToIntro = () => {
    setPhase('intro');
    setResult(null);
    resetPlayState();
    storeReset();
  };

  const handleRetryNewQuiz = useCallback(async () => {
    try {
      setGenerating(true);
      setGenerationStatus('Iniciando…');
      setPhase('intro');
      setResult(null);
      resetPlayState();
      storeReset();
      const newQuiz = await quizzesService.generateQuizAsync(
        videoId,
        undefined,
        (status) => setGenerationStatus(mapJobStatusToLabel(status)),
      );
      setQuiz(newQuiz);
      // Refresh stats (cumulativo per video — quiz é regenerado a cada Novo Quiz)
      if (newQuiz) {
        const newStats = await quizzesService.getVideoStats(videoId);
        setStats(newStats);
      }
      setGenerationStatus(null);
    } catch (error) {
      logger.error('Erro ao gerar novo quiz:', error);
      Alert.alert('Erro', 'Nao foi possivel gerar um novo quiz. Tente novamente.');
      setGenerationStatus(null);
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return null;
    const question = quiz.questions[currentQuestionIndex];
    if (!question || !question.options) return null;
    const isLast = currentQuestionIndex === quiz.questions.length - 1;
    const awaitingConfidence = playStep === 'awaitingConfidence';
    const totalQuestions = quiz.questions.length;
    const xpProgressPct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    return (
      <LinearGradient
        colors={['#F4FAFF', '#E1EFFC']}
        style={styles.fullscreenContainer}
      >
        {/* Header gamificado: close X round + XP bar + streak pill */}
        <View style={styles.gameHeader}>
          <TouchableOpacity
            onPress={handleCloseModal}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#6F8AA8" />
          </TouchableOpacity>

          <View style={styles.xpBarWrap}>
            <LinearGradient
              colors={['#1E6FD9', '#4FA8E8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpBarFill, { width: `${xpProgressPct}%` }]}
            />
          </View>

          <LinearGradient
            colors={['#FF8B3D', '#FFB020']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakPill}
          >
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{combo}</Text>
          </LinearGradient>
        </View>

        <QuestionCard
          question={{
            id: question.id,
            question: question.question,
            options: question.options,
          }}
          selectedAnswer={selectedOption}
          onSelect={handleSelectOption}
          disabled={submitting || awaitingConfidence}
          progress={{
            current: currentQuestionIndex + 1,
            total: totalQuestions,
          }}
        />

        {/* Bottom area: confidence rating now lives INSIDE GelpiCelebrateModal
            during awaitingConfidence. Footer only shows hint or submitting. */}
        <View style={styles.playFooter}>
          {!awaitingConfidence && (
            <Text style={styles.hintText}>
              Toque em uma alternativa para responder
              {isLast ? ' (última questão)' : ''}
            </Text>
          )}
          {submitting && (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.submittingText}>Enviando…</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  };

  const renderResultPhase = () => {
    if (!result) return null;

    return (
      <LinearGradient
        colors={['#F4FAFF', '#E1EFFC']}
        style={styles.fullscreenContainer}
      >
        {/* Header simples no result phase */}
        <View style={styles.gameHeader}>
          <TouchableOpacity
            onPress={handleCloseModal}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#6F8AA8" />
          </TouchableOpacity>
          <Text style={styles.resultHeaderTitle}>Resultado</Text>
          <View style={{ width: 34 }} />
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
      </LinearGradient>
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
          generationStatus={generationStatus}
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
          <ScreenShake trigger={shakeTrigger}>
            {phase === 'play' && renderPlayPhase()}
            {phase === 'result' && renderResultPhase()}
          </ScreenShake>

          {/* Overlays — outside ScreenShake so they don't shake with content */}
          {phase === 'play' && <ComboMeter combo={combo} />}
          <XpBurst
            xp={xpBurstValue}
            visible={xpBurstVisible}
            onDone={() => setXpBurstVisible(false)}
          />
          <ConfettiSkia
            active={confettiActive}
            count={result?.score === 100 ? 120 : 60}
          />
          <GelpiCelebrateModal
            kind={lottieKind}
            xpGained={lottieKind === 'wrong' ? 0 : xpBurstValue}
            comboValue={combo}
            accuracyPct={accuracyPct}
            selectedConfidence={selectedConfidence}
            onSelectConfidence={handleConfidenceTap}
            onContinue={handleContinue}
          />
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

  // Play footer (hint / submitting only — ConfidenceRating moved into modal)
  playFooter: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  hintText: {
    fontSize: 12,
    color: '#6F8AA8',
    textAlign: 'center',
    paddingVertical: 16,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  submittingText: {
    fontSize: 12,
    color: '#6F8AA8',
  },

  // Fullscreen modal chrome — gradient bg via LinearGradient wrap
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#F4FAFF',
  },
  fullscreenContainer: {
    flex: 1,
  },

  // Header gamificado conforme styles.css Marcelo
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(11, 40, 69, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpBarWrap: {
    flex: 1,
    height: 12,
    backgroundColor: '#DDE7F0',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C5D2E0',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    shadowColor: '#FF8B3D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 50,
    justifyContent: 'center',
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakNumber: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  resultHeaderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2845',
    textAlign: 'center',
  },
});
