'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  Clock, 
  Target, 
  Trophy,
  BookOpen,
  ArrowRight,
  SkipForward
} from 'lucide-react';
import { Quiz, QuizStats } from '@/lib/api/quizzes.service';

interface QuizIntroProps {
  quiz: Quiz;
  stats?: QuizStats;
  onStart: () => void;
  onSkip: () => void;
}

export function QuizIntro({ quiz, stats, onStart, onSkip }: QuizIntroProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-500 hover:bg-green-600';
      case 'MEDIUM':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'HARD':
        return 'bg-red-500 hover:bg-red-600';
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

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return '🟢';
      case 'MEDIUM':
        return '🟡';
      case 'HARD':
        return '🔴';
      default:
        return '⚪';
    }
  };

  // Variantes de animação
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number]
      }
    }
  };

  const pulseVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 px-1 sm:px-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header com ícone animado */}
      <motion.div 
        className="text-center space-y-2"
        variants={itemVariants}
      >
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-medical-500 to-medical-700 text-white shadow-lg"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Target className="w-8 h-8 sm:w-10 sm:h-10" />
        </motion.div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Teste Seu Conhecimento!
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto px-2">
          Você está prestes a iniciar um quiz sobre o conteúdo desta aula. 
          Prepare-se e boa sorte!
        </p>
      </motion.div>

      {/* Card principal do quiz */}
      <motion.div variants={itemVariants}>
        <Card className="border-2 border-slate-200 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-medical-600 flex-shrink-0" />
                  <span className="truncate">{quiz.title}</span>
                </CardTitle>
                {quiz.description && (
                  <CardDescription className="text-xs sm:text-sm line-clamp-2">
                    {quiz.description}
                  </CardDescription>
                )}
              </div>
              <Badge className={`${getDifficultyColor(quiz.difficulty)} text-white text-xs sm:text-sm self-start flex-shrink-0`}>
                {getDifficultyIcon(quiz.difficulty)} {getDifficultyLabel(quiz.difficulty)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Informações do Quiz em Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <motion.div 
                className="text-center p-2 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200"
                whileHover={{ scale: 1.02, backgroundColor: '#f1f5f9' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full bg-blue-100 text-blue-600">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{quiz.questions.length}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Questões</p>
              </motion.div>

              <motion.div 
                className="text-center p-2 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200"
                whileHover={{ scale: 1.02, backgroundColor: '#f1f5f9' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full bg-amber-100 text-amber-600">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">
                  {quiz.timeLimit ? `~${Math.round(quiz.timeLimit / 60)}` : '∞'}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  {quiz.timeLimit ? 'Min' : 'Livre'}
                </p>
              </motion.div>

              <motion.div 
                className="text-center p-2 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200"
                whileHover={{ scale: 1.02, backgroundColor: '#f1f5f9' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-full bg-green-100 text-green-600">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <p className="text-lg sm:text-2xl font-bold text-slate-900">{quiz.passingScore}%</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Mínimo</p>
              </motion.div>
            </div>

            {/* Estatísticas anteriores (se houver) */}
            {stats && stats.totalAttempts > 0 && (
              <motion.div 
                className="rounded-lg sm:rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-3 sm:p-4"
                variants={itemVariants}
              >
                <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                  Seu Histórico
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-slate-600">Melhor:</span>
                    <span className="font-bold text-medical-600">{stats.bestScore}%</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span className="text-slate-600">Tentativas:</span>
                    <span className="font-bold text-slate-900">{stats.totalAttempts}</span>
                  </div>
                </div>
                {stats.passed && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200">
                    <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-300 text-xs sm:text-sm py-1">
                      ✅ Aprovado!
                    </Badge>
                  </div>
                )}
              </motion.div>
            )}

            {/* Dicas */}
            <motion.div 
              className="rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 p-3 sm:p-4"
              variants={itemVariants}
            >
              <h4 className="text-xs sm:text-sm font-semibold text-amber-800 mb-1.5 sm:mb-2">💡 Dicas</h4>
              <ul className="text-xs sm:text-sm text-amber-700 space-y-0.5 sm:space-y-1">
                <li>• Leia cada questão com atenção</li>
                <li>• Você pode navegar entre as questões</li>
                <li>• O timer começa ao clicar em "Começar"</li>
                {!quiz.timeLimit && (
                  <li>• Sem limite de tempo, vá no seu ritmo</li>
                )}
              </ul>
            </motion.div>

            {/* Botões de Ação */}
            <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
              <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="animate"
              >
                <Button
                  onClick={onStart}
                  size="lg"
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-medical-600 to-medical-700 hover:from-medical-700 hover:to-medical-800 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <PlayCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  Começar Quiz!
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </motion.div>

              <Button
                onClick={onSkip}
                variant="ghost"
                size="default"
                className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-10 sm:h-11 text-sm sm:text-base"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Pular por agora
              </Button>
            </div>

            {/* Nota de rodapé */}
            <p className="text-[10px] sm:text-xs text-center text-slate-400">
              Você pode refazer este quiz quantas vezes quiser
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}