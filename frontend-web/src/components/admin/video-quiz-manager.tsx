'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Eye, Sparkles, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { quizzesService, Quiz } from '@/lib/api/quizzes.service';

interface VideoQuizManagerProps {
  videoId: string;
}

export function VideoQuizManager({ videoId }: VideoQuizManagerProps) {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(600);
  const [passingScore, setPassingScore] = useState(70);

  // Carregar quizzes
  useEffect(() => {
    loadQuizzes();
  }, [videoId]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const data = await quizzesService.listQuizzesByVideo(videoId).catch(() => []);
      setQuizzes(data);
    } catch (error: any) {
      console.error('Erro ao carregar quizzes:', error);
      setQuizzes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe um título para o quiz.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGenerating(true);
      const quiz = await quizzesService.generateQuiz(videoId, {
        title: title.trim(),
        description: description.trim() || undefined,
        difficulty,
        questionCount,
        timeLimit,
        passingScore,
      });

      toast({
        title: 'Quiz gerado!',
        description: `${quiz.questions.length} questões foram criadas com sucesso.`,
      });

      setQuizzes([...quizzes, quiz]);
      setShowGenerateDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao gerar quiz:', error);
      toast({
        title: 'Erro ao gerar quiz',
        description: error.response?.data?.message || 'Não foi possível gerar o quiz. Verifique se o vídeo tem transcrição ou legendas.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!quizToDelete) return;

    try {
      setIsDeleting(true);
      await quizzesService.deleteQuiz(quizToDelete.id);
      setQuizzes(quizzes.filter(q => q.id !== quizToDelete.id));
      toast({
        title: 'Quiz deletado',
        description: 'O quiz foi removido com sucesso.',
      });
      setShowDeleteDialog(false);
      setQuizToDelete(null);
    } catch (error: any) {
      console.error('Erro ao deletar quiz:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o quiz.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePreview = async (quiz: Quiz) => {
    try {
      const fullQuiz = await quizzesService.getQuiz(quiz.id);
      setPreviewQuiz(fullQuiz);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error('Erro ao carregar quiz:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o quiz.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDifficulty('MEDIUM');
    setQuestionCount(10);
    setTimeLimit(600);
    setPassingScore(70);
  };

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'EASY': return 'Fácil';
      case 'MEDIUM': return 'Médio';
      case 'HARD': return 'Difícil';
      default: return diff;
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'EASY': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HARD': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Quiz Gamificado
              </CardTitle>
              <CardDescription>
                Gere quizzes automaticamente com IA para testar o conhecimento dos alunos
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              disabled={isLoading}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Gerar Quiz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">Nenhum quiz criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Gere um quiz automaticamente com IA para este vídeo
              </p>
              <Button onClick={() => setShowGenerateDialog(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Gerar Primeiro Quiz
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{quiz.title}</h4>
                      <Badge className={getDifficultyColor(quiz.difficulty)}>
                        {getDifficultyLabel(quiz.difficulty)}
                      </Badge>
                    </div>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {quiz.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{quiz.questions.length} questões</span>
                      {quiz.timeLimit && (
                        <span>~{Math.round(quiz.timeLimit / 60)} min</span>
                      )}
                      <span>Nota mínima: {quiz.passingScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(quiz)}
                      title="Visualizar questões"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setQuizToDelete(quiz);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive hover:text-destructive"
                      title="Deletar quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Geração */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gerar Quiz com IA</DialogTitle>
            <DialogDescription>
              Configure as opções e deixe a IA criar as questões automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Quiz: Técnicas de Sutura"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo do quiz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isGenerating}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Dificuldade</Label>
                <Select
                  value={difficulty}
                  onValueChange={(value: any) => setDifficulty(value)}
                  disabled={isGenerating}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Fácil</SelectItem>
                    <SelectItem value="MEDIUM">Médio</SelectItem>
                    <SelectItem value="HARD">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionCount">Nº de Questões</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min={5}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Tempo Limite (seg)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min={60}
                  max={3600}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 600)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingScore">Nota Mínima (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {isGenerating && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Gerando questões com IA... Isso pode levar até 1 minuto.
                </span>
              </div>
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Importante:</strong> O vídeo precisa ter transcrição ou legendas para gerar o quiz.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateDialog(false);
                resetForm();
              }}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !title.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o quiz &quot;{quizToDelete?.title}&quot;?
              Todas as tentativas dos alunos também serão removidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setQuizToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewQuiz?.title}</DialogTitle>
            <DialogDescription>
              Visualização das questões do quiz
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewQuiz?.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-4">
                <div className="font-medium mb-3">
                  {index + 1}. {question.question}
                </div>
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                    >
                      <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs">
                        {String.fromCharCode(65 + optIndex)}
                      </div>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}