'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Target, 
  Clock, 
  PlayCircle, 
  SkipForward,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { Quiz, QuizStats } from '@/lib/api/quizzes.service';

interface QuizCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQuiz: () => void;
  quiz: Quiz;
  stats?: QuizStats;
  videoTitle: string;
}

export function QuizCompletionModal({ 
  isOpen, 
  onClose, 
  onStartQuiz, 
  quiz, 
  stats,
  videoTitle 
}: QuizCompletionModalProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'HARD':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'Fácil';
      case 'MEDIUM':
        return 'Médio';
      case 'HARD':
        return 'Difícil';
      default:
        return difficulty;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto p-4 sm:p-6">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header com animação de celebração */}
              <DialogHeader className="text-center pb-3 sm:pb-4">
                <motion.div
                  className="flex justify-center mb-3 sm:mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 15,
                    delay: 0.1 
                  }}
                >
                  <div className="relative">
                    <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                    {/* Sparkles animados */}
                    <motion.div
                      className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut" as const
                      }}
                    >
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-0.5 -left-1 sm:-bottom-1 sm:-left-2"
                      animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, -10, 10, 0]
                      }}
                      transition={{ 
                        duration: 1.8, 
                        repeat: Infinity,
                        ease: "easeInOut" as const,
                        delay: 0.3
                      }}
                    >
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    </motion.div>
                  </div>
                </motion.div>

                <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                  🎉 Parabéns!
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base text-slate-600 px-2">
                  Você concluiu a aula <span className="font-medium text-slate-700 line-clamp-1">"{videoTitle}"</span>
                </DialogDescription>
              </DialogHeader>

              {/* Conteúdo do Quiz */}
              <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                {/* Card do Quiz */}
                <motion.div 
                  className="rounded-lg sm:rounded-xl border-2 border-medical-200 bg-medical-50/50 p-3 sm:p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-medical-600 flex-shrink-0" />
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">Quiz Disponível!</h3>
                    </div>
                    <Badge className={`${getDifficultyColor(quiz.difficulty)} text-white text-[10px] sm:text-xs flex-shrink-0`}>
                      {getDifficultyLabel(quiz.difficulty)}
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
                    Teste seus conhecimentos sobre o conteúdo desta aula.
                  </p>

                  {/* Informações do Quiz */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                    <div className="rounded-md sm:rounded-lg bg-white p-1.5 sm:p-2 border border-slate-200">
                      <p className="text-base sm:text-lg font-bold text-slate-900">{quiz.questions.length}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">Questões</p>
                    </div>
                    <div className="rounded-md sm:rounded-lg bg-white p-1.5 sm:p-2 border border-slate-200">
                      <p className="text-base sm:text-lg font-bold text-slate-900">
                        {quiz.timeLimit ? `~${Math.round(quiz.timeLimit / 60)}` : '∞'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {quiz.timeLimit ? 'Min' : 'Livre'}
                      </p>
                    </div>
                    <div className="rounded-md sm:rounded-lg bg-white p-1.5 sm:p-2 border border-slate-200">
                      <p className="text-base sm:text-lg font-bold text-slate-900">{quiz.passingScore}%</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">Mínimo</p>
                    </div>
                  </div>

                  {/* Estatísticas anteriores */}
                  {stats && stats.totalAttempts > 0 && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-medical-200">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                          <span className="hidden xs:inline">Melhor pontuação:</span>
                          <span className="xs:hidden">Melhor:</span>
                        </span>
                        <span className="font-bold text-medical-600">{stats.bestScore}%</span>
                      </div>
                      {stats.passed && (
                        <Badge variant="outline" className="w-full justify-center mt-2 bg-green-50 text-green-700 border-green-300 text-[10px] sm:text-xs py-0.5 sm:py-1">
                          ✅ Aprovado!
                        </Badge>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Botões de Ação */}
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    onClick={onStartQuiz}
                    size="lg"
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-medical-600 to-medical-700 hover:from-medical-700 hover:to-medical-800 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <PlayCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Testar Conhecimento!
                  </Button>

                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="default"
                    className="w-full text-slate-500 hover:text-slate-700 h-9 sm:h-10 text-sm"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Pular por agora
                  </Button>
                </motion.div>

                {/* Nota */}
                <p className="text-[10px] sm:text-xs text-center text-slate-400">
                  Você pode fazer o quiz a qualquer momento pela aba "Quiz"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}