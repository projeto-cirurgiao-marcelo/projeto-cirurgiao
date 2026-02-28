'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lock, PlayCircle, CheckCircle } from 'lucide-react';

interface QuizLockedCardProps {
  watchProgress?: number; // Porcentagem de progresso do vídeo (0-100)
  hasQuiz: boolean;
}

export function QuizLockedCard({ watchProgress = 0, hasQuiz }: QuizLockedCardProps) {
  if (!hasQuiz) {
    return (
      <Card className="w-full border-slate-200">
        <CardContent className="py-6 sm:py-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-slate-100">
            <PlayCircle className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
          </div>
          <p className="text-slate-500 text-xs sm:text-sm">
            Nenhum quiz disponível para esta aula
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full border-2 border-dashed border-slate-300 bg-slate-50/50">
        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div 
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-200 flex-shrink-0"
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut" as const
              }}
            >
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-slate-500" />
            </motion.div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg text-slate-700">
                🔒 Quiz Bloqueado
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Complete a aula para desbloquear
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 sm:pt-0">
          {/* Barra de Progresso */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-600">Progresso da aula</span>
              <span className="font-medium text-slate-700">{Math.round(watchProgress)}%</span>
            </div>
            <Progress value={watchProgress} className="h-1.5 sm:h-2" />
          </div>

          {/* Instruções */}
          <div className="rounded-md sm:rounded-lg bg-white border border-slate-200 p-3 sm:p-4 space-y-2 sm:space-y-3">
            <h4 className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-medical-600 flex-shrink-0" />
              Como desbloquear:
            </h4>
            <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 sm:space-y-2">
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="text-medical-600 font-bold">1.</span>
                <span>Assista a aula até o final</span>
              </li>
              <li className="flex items-start gap-1.5 sm:gap-2">
                <span className="text-medical-600 font-bold">2.</span>
                <span>Ou clique em "Marcar como Concluído"</span>
              </li>
            </ul>
          </div>

          {/* Dica */}
          <div className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-md sm:rounded-lg p-2 sm:p-3">
            <span className="text-amber-500 flex-shrink-0">💡</span>
            <p>
              O quiz ajuda a fixar o conteúdo. 
              Complete a aula para testar seus conhecimentos!
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
