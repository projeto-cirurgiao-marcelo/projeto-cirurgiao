'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { ForumTopic, ReportReason } from '@/lib/types/forum.types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { VoteButtons } from '@/components/forum/vote-buttons';
import { ReplyCard } from '@/components/forum/reply-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowLeft,
  Pin,
  Lock,
  CheckCircle,
  Eye,
  MessageSquare,
  Send,
  MoreVertical,
  Trash2,
  Flag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam', description: 'Conteudo promocional ou repetitivo' },
  { value: 'INAPPROPRIATE', label: 'Inapropriado', description: 'Conteudo inadequado para o forum' },
  { value: 'OFFENSIVE', label: 'Ofensivo', description: 'Linguagem ofensiva ou desrespeitosa' },
  { value: 'OFF_TOPIC', label: 'Fora do topico', description: 'Nao relacionado a categoria' },
  { value: 'OTHER', label: 'Outro', description: 'Outro motivo nao listado' },
];

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Report dialog
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Delete confirm dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = user?.id === topic?.authorId;
  const isAdmin = user?.role === 'ADMIN';
  const canDelete = isAuthor || isAdmin;
  const canMarkSolved = isAuthor;

  useEffect(() => {
    loadTopic();
  }, [topicId]);

  const loadTopic = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await forumService.getTopicById(topicId);
      setTopic(data);
    } catch (err) {
      console.error('Erro ao carregar topico:', err);
      setError('Erro ao carregar topico');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, escreva uma resposta',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      await forumService.createReply({
        topicId,
        content: replyContent,
      });

      toast({
        title: 'Sucesso',
        description: 'Resposta enviada com sucesso',
      });

      setReplyContent('');
      await loadTopic();
    } catch (err) {
      console.error('Erro ao enviar resposta:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar resposta',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    setDeleting(true);
    try {
      await forumService.deleteTopic(topicId);
      toast({
        title: 'Sucesso',
        description: 'Topico excluido com sucesso',
      });
      setShowDeleteDialog(false);
      router.back();
    } catch (err) {
      console.error('Erro ao excluir topico:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir topico',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleSolved = async () => {
    if (!topic) return;
    try {
      const updated = await forumService.updateTopic(topicId, {
        isSolved: !topic.isSolved,
      });
      setTopic((prev) => (prev ? { ...prev, isSolved: updated.isSolved } : prev));
      toast({
        title: 'Sucesso',
        description: updated.isSolved
          ? 'Topico marcado como resolvido'
          : 'Topico desmarcado como resolvido',
      });
    } catch (err) {
      console.error('Erro ao atualizar topico:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar topico',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) return;
    setSubmittingReport(true);
    try {
      await forumService.reportTopic({
        topicId,
        reason: selectedReason,
        description: reportDescription.trim() || undefined,
      });
      setShowReportDialog(false);
      setSelectedReason(null);
      setReportDescription('');
      toast({
        title: 'Denuncia enviada',
        description: 'Sua denuncia foi registrada e sera analisada pela moderacao.',
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || '';
      if (message.includes('ja denunciou') || message.includes('already')) {
        toast({
          title: 'Aviso',
          description: 'Voce ja denunciou este topico anteriormente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Erro ao enviar denuncia',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error || 'Topico nao encontrado'}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumbs */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/student/forum" className="hover:text-foreground">
          Forum
        </Link>
        <span>/</span>
        {topic.category && (
          <>
            <Link
              href={`/student/forum/${topic.category.id}`}
              className="hover:text-foreground"
            >
              {topic.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground truncate max-w-[200px]">{topic.title}</span>
      </div>

      {/* Topic Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <VoteButtons
            type="topic"
            id={topic.id}
            initialUpvotes={topic.upvotes}
            initialDownvotes={topic.downvotes}
          />

          <div className="flex-1">
            {/* Title + Actions Row */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {topic.isPinned && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Pin className="h-3 w-3 mr-1" />
                      Fixado
                    </Badge>
                  )}
                  {topic.isClosed && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      <Lock className="h-3 w-3 mr-1" />
                      Fechado
                    </Badge>
                  )}
                  {topic.isSolved && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolvido
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold">{topic.title}</h1>
              </div>

              {/* Dropdown Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Marcar como resolvido (autor) */}
                  {canMarkSolved && (
                    <DropdownMenuItem onClick={handleToggleSolved}>
                      {topic.isSolved ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                          Desmarcar resolvido
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                          Marcar como resolvido
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  {/* Denunciar (todos exceto autor) */}
                  {!isAuthor && (
                    <DropdownMenuItem onClick={() => {
                      setSelectedReason(null);
                      setReportDescription('');
                      setShowReportDialog(true);
                    }}>
                      <Flag className="h-4 w-4 mr-2 text-yellow-600" />
                      Denunciar
                    </DropdownMenuItem>
                  )}

                  {/* Excluir (autor ou admin) */}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir topico
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content */}
            <div className="prose prose-sm max-w-none mb-4">
              <p className="whitespace-pre-wrap">{topic.content}</p>
            </div>

            {/* Video Link */}
            {topic.video && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-1">Relacionado ao video:</p>
                <Link
                  href={`/student/courses/${topic.video.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {topic.video.title}
                </Link>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Por <span className="font-medium">{topic.author.name}</span></span>
              <span className="hidden sm:inline">•</span>
              <span>{format(new Date(topic.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {topic.views}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {topic._count?.replies || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Replies Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">
          Respostas ({topic._count?.replies || 0})
        </h2>

        {topic.replies && topic.replies.length > 0 ? (
          <div className="space-y-4">
            {topic.replies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                onVoteChange={loadTopic}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma resposta ainda. Seja o primeiro a responder!
          </div>
        )}
      </div>

      {/* Reply Form */}
      {!topic.isClosed && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Sua Resposta</h3>
          <form onSubmit={handleSubmitReply}>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escreva sua resposta..."
              className="min-h-[120px] mb-4"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !replyContent.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {topic.isClosed && (
        <div className="bg-gray-100 rounded-lg border border-gray-200 p-6 text-center">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            Este topico esta fechado e nao aceita mais respostas
          </p>
        </div>
      )}

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir topico</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este topico? Esta acao nao pode ser desfeita.
              Todas as respostas e votos serao removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTopic}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Report Dialog ---- */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Denunciar topico</DialogTitle>
            <DialogDescription>
              Selecione o motivo da denuncia. Nossa equipe de moderacao analisara o conteudo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label className="text-sm font-semibold">Motivo</Label>
            <div className="space-y-2">
              {REPORT_REASONS.map((item) => (
                <label
                  key={item.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === item.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={item.value}
                    checked={selectedReason === item.value}
                    onChange={() => setSelectedReason(item.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <span className="font-medium text-sm">{item.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2">
              <Label className="text-sm font-semibold">Descricao adicional (opcional)</Label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Descreva o problema com mais detalhes..."
                className="mt-2 min-h-[80px]"
                maxLength={500}
                disabled={submittingReport}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              disabled={submittingReport}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={!selectedReason || submittingReport}
            >
              {submittingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Enviar denuncia
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
