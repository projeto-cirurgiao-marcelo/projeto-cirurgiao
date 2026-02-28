'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Clock, Send, Check } from 'lucide-react';
import { Quiz, QuizAnswer } from '@/lib/api/quizzes.service';

interface QuizPlayerProps {
  quiz: Quiz;
  onSubmit: (answers: QuizAnswer[], totalTime: number) => void;
  onCancel?: () => void;
}

export function QuizPlayer({ quiz, onSubmit, onCancel }: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Map<string, number>>(new Map());
  const [totalStartTime] = useState<number>(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [direction, setDirection] = useState(0); // Para animação de slide

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const hasAnsweredCurrent = answers.has(currentQuestion.id);
  const allQuestionsAnswered = answers.size === quiz.questions.length;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - totalStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [totalStartTime]);

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Selecionar resposta
  const handleSelectAnswer = (answerIndex: number) => {
    // Registrar tempo gasto na questão
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    setQuestionTimes(new Map(questionTimes.set(currentQuestion.id, timeSpent)));
    
    // Salvar resposta
    setAnswers(new Map(answers.set(currentQuestion.id, answerIndex)));
  };

  // Navegar para próxima questão
  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setDirection(1);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
    }
  };

  // Navegar para questão anterior
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setDirection(-1);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setQuestionStartTime(Date.now());
    }
  };

  // Submeter quiz
  const handleSubmit = () => {
    if (!allQuestionsAnswered) {
      alert('Por favor, responda todas as questões antes de submeter.');
      return;
    }

    const quizAnswers: QuizAnswer[] = quiz.questions.map((question) => ({
      questionId: question.id,
      answer: answers.get(question.id)!,
      timeSpent: questionTimes.get(question.id),
    }));

    const totalTime = Math.floor((Date.now() - totalStartTime) / 1000);
    onSubmit(quizAnswers, totalTime);
  };

  // Variantes de animação para as questões
  const questionVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Header com progresso */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-lg">
                Questão {currentQuestionIndex + 1} de {quiz.questions.length}
              </CardTitle>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground bg-slate-100 px-2 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
            </div>
            <Progress value={progress} className="mt-2 h-1.5 sm:h-2" />
          </CardHeader>
        </Card>
      </motion.div>

      {/* Questão atual com animação */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentQuestionIndex}
          custom={direction}
          variants={questionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
        >
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-xl leading-relaxed">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = answers.get(currentQuestion.id) === index;
                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      className={`w-full flex items-center gap-2 sm:gap-3 rounded-lg border-2 p-3 sm:p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-gray-200 hover:border-primary/50 hover:bg-accent'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <motion.div
                        className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected 
                            ? 'border-primary bg-primary' 
                            : 'border-gray-300'
                        }`}
                        animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <span className={`flex-1 text-sm sm:text-base ${isSelected ? 'font-semibold text-primary' : ''}`}>
                        {option}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navegação */}
      <motion.div
        className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Indicadores de questão - Mobile: acima dos botões */}
        <div className="flex gap-1.5 sm:gap-2 order-1 sm:order-2 flex-wrap justify-center">
          {quiz.questions.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > currentQuestionIndex ? 1 : -1);
                setCurrentQuestionIndex(index);
                setQuestionStartTime(Date.now());
              }}
              className={`h-2 sm:h-2.5 rounded-full transition-all ${
                index === currentQuestionIndex
                  ? 'bg-primary w-4 sm:w-5'
                  : answers.has(quiz.questions[index].id)
                  ? 'bg-green-500 w-2 sm:w-2.5'
                  : 'bg-muted w-2 sm:w-2.5'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Ir para questão ${index + 1}`}
            />
          ))}
        </div>

        {/* Botões de navegação */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 order-2 sm:order-1">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            size="default"
            className="flex-1 sm:flex-none h-10 sm:h-11 text-sm sm:text-base"
          >
            <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Anterior</span>
            <span className="xs:hidden">Ant.</span>
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] h-10 sm:h-11 text-sm sm:text-base"
            >
              <Send className="mr-1 sm:mr-2 h-4 w-4" />
              Finalizar
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!hasAnsweredCurrent}
              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] h-10 sm:h-11 text-sm sm:text-base"
            >
              <span className="hidden xs:inline">Próxima</span>
              <span className="xs:hidden">Próx.</span>
              <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Botão de cancelar */}
      {onCancel && (
        <div className="text-center">
          <Button variant="ghost" onClick={onCancel} className="text-muted-foreground text-sm h-9">
            Cancelar Quiz
          </Button>
        </div>
      )}

      {/* Aviso de questões não respondidas */}
      <AnimatePresence>
        {!allQuestionsAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="py-3 sm:pt-6 px-3 sm:px-6">
                <p className="text-xs sm:text-sm text-yellow-800 text-center">
                  ⚠️ {quiz.questions.length - answers.size} questão(ões) sem resposta
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
