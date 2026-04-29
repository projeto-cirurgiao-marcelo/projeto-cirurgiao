'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { ForumTopic, ForumReply, ReportReason } from '@/lib/types/forum.types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { VoteButtons } from '@/components/forum/vote-buttons';
import { ReplyCard } from '@/components/forum/reply-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ArrowLeft,
  Pin,
  Lock,
  CheckCircle,
  Eye,
  MessageSquare,
  Send,
  PlayCircle,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  AlertTriangle,
} from 'lucide-react';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/shared/page-transition';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { atlasToast } from '@/components/atlas';

import { logger } from '@/lib/logger';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'INAPPROPRIATE', label: 'Conteúdo inadequado' },
  { value: 'OFFENSIVE', label: 'Conteúdo ofensivo' },
  { value: 'OFF_TOPIC', label: 'Fora do tópico' },
  { value: 'OTHER', label: 'Outro motivo' },
];

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  const user = useAuthStore((s) => s.user);

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado de edição de tópico
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);

  // Estado de edição de resposta
  const [editingReply, setEditingReply] = useState<ForumReply | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  // Estado de denúncia
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const currentUserId = user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isTopicAuthor = currentUserId === topic?.authorId;

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
      logger.error('Erro ao carregar tópico:', err);
      setError('Erro ao carregar tópico');
    } finally {
      setLoading(false);
    }
  };

  // ===== RESPOSTAS =====

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      atlasToast.warning('Escreva uma resposta antes de enviar');
      return;
    }

    try {
      setSubmitting(true);
      await forumService.createReply({ topicId, content: replyContent });
      // Sem toast — resposta aparece imediato na lista (feedback inline)
      setReplyContent('');
      await loadTopic();
    } catch (err) {
      logger.error('Erro ao enviar resposta:', err);
      atlasToast.error('Falha ao enviar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReply = (reply: ForumReply) => {
    setEditingReply(reply);
    setEditReplyContent(reply.content);
  };

  const handleSaveEditReply = async () => {
    if (!editingReply || !editReplyContent.trim()) return;

    try {
      setSavingReply(true);
      await forumService.updateReply(editingReply.id, editReplyContent.trim());
      // Sem toast — conteúdo atualiza inline
      setEditingReply(null);
      setEditReplyContent('');
      await loadTopic();
    } catch (err) {
      logger.error('Erro ao editar resposta:', err);
      atlasToast.error('Falha ao atualizar resposta');
    } finally {
      setSavingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta resposta?')) return;

    try {
      await forumService.deleteReply(replyId);
      // Sem toast — resposta sai da lista
      await loadTopic();
    } catch (err) {
      logger.error('Erro ao deletar resposta:', err);
      atlasToast.error('Falha ao deletar resposta');
    }
  };

  // ===== TÓPICO =====

  const handleEditTopic = () => {
    if (!topic) return;
    setEditTopicTitle(topic.title);
    setEditTopicContent(topic.content);
    setIsEditingTopic(true);
  };

  const handleSaveEditTopic = async () => {
    if (!editTopicTitle.trim() || !editTopicContent.trim()) return;

    try {
      setSavingTopic(true);
      await forumService.updateTopic(topicId, {
        title: editTopicTitle.trim(),
        content: editTopicContent.trim(),
      });
      // Sem toast — conteúdo do tópico atualiza inline
      setIsEditingTopic(false);
      await loadTopic();
    } catch (err) {
      logger.error('Erro ao editar tópico:', err);
      atlasToast.error('Falha ao atualizar tópico');
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!confirm('Tem certeza que deseja deletar este tópico? Todas as respostas também serão removidas.')) return;

    try {
      await forumService.deleteTopic(topicId);
      atlasToast.success('Tópico removido');
      router.push('/student/forum');
    } catch (err) {
      logger.error('Erro ao deletar tópico:', err);
      atlasToast.error('Falha ao deletar tópico');
    }
  };

  // ===== ADMIN: Pin/Close/Solve =====

  const handleTogglePin = async () => {
    if (!topic) return;
    try {
      await forumService.updateTopic(topicId, { isPinned: !topic.isPinned });
      atlasToast.success(topic.isPinned ? 'Tópico desafixado' : 'Tópico fixado');
      await loadTopic();
    } catch (err) {
      atlasToast.error('Falha ao alterar fixação');
    }
  };

  const handleToggleClose = async () => {
    if (!topic) return;
    try {
      await forumService.updateTopic(topicId, { isClosed: !topic.isClosed });
      atlasToast.success(topic.isClosed ? 'Tópico reaberto' : 'Tópico fechado');
      await loadTopic();
    } catch (err) {
      atlasToast.error('Falha ao alterar status');
    }
  };

  const handleToggleSolved = async () => {
    if (!topic) return;
    try {
      await forumService.updateTopic(topicId, { isSolved: !topic.isSolved });
      atlasToast.success(topic.isSolved ? 'Desmarcado como resolvido' : 'Marcado como resolvido');
      await loadTopic();
    } catch (err) {
      atlasToast.error('Falha ao alterar status');
    }
  };

  // ===== DENÚNCIA =====

  const handleSubmitReport = async () => {
    if (!reportReason) {
      atlasToast.warning('Selecione um motivo');
      return;
    }

    try {
      setSubmittingReport(true);
      await forumService.reportTopic({
        topicId,
        reason: reportReason as ReportReason,
        description: reportDescription.trim() || undefined,
      });
      atlasToast.success('Denúncia enviada', {
        description: 'Obrigado por ajudar a manter a comunidade segura.',
      });
      setIsReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      logger.error('Erro ao enviar denúncia:', err);
      const message = err?.response?.data?.message || 'Erro ao enviar denúncia';
      atlasToast.error('Falha ao enviar denúncia', { description: message });
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-7">
        <div className="max-w-4xl mx-auto">
          <div className="h-1 bg-atlas-line rounded-sm overflow-hidden mb-6">
            <div className="h-full w-1/3 bg-atlas-primary animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !topic) {
    return (
      <main className="min-h-screen bg-atlas-bg px-5 sm:px-7 py-10">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-atlas-muted hover:text-atlas-ink transition-colors mb-5"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Voltar
          </button>
          <div className="bg-atlas-surface border border-dashed border-atlas-line rounded-md px-7 pt-14 pb-16 text-center">
            <p className="font-serif text-[17px] font-medium text-atlas-ink mb-1.5">
              {error || 'Tópico não encontrado'}
            </p>
            <p className="text-atlas-muted text-[13px] max-w-[420px] mx-auto leading-[1.55]">
              Verifique o link ou volte para o fórum.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const replyCount = topic._count?.replies || 0;

  return (
    <main className="min-h-screen bg-atlas-bg">
      <div className="mx-auto max-w-4xl px-5 sm:px-7 py-6 sm:py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[12.5px] mb-5 flex-wrap text-atlas-muted">
          <Link href="/student/forum" className="hover:text-atlas-ink transition-colors">
            Fórum
          </Link>
          <ChevronRight className="size-3 text-atlas-muted-2" />
          {topic.category && (
            <>
              <Link
                href={`/student/forum/${topic.category.id}`}
                className="hover:text-atlas-ink transition-colors"
              >
                {topic.category.name}
              </Link>
              <ChevronRight className="size-3 text-atlas-muted-2" />
            </>
          )}
          <span className="text-atlas-ink font-medium truncate max-w-[200px]">
            {topic.title}
          </span>
        </nav>

        {/* Topic Card */}
        <div className="bg-atlas-surface rounded-md border border-atlas-line overflow-hidden mb-6">
          {/* Status Badges Bar */}
          {(topic.isPinned || topic.isClosed || topic.isSolved) && (
            <div className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-atlas-surface-2 border-b border-atlas-line">
              {topic.isPinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm atlas-mono text-[10px] font-medium bg-atlas-warn/10 text-atlas-warn-deep border border-atlas-warn/30 uppercase tracking-[0.04em]">
                  <Pin className="size-2.5" strokeWidth={1.75} />
                  Fixado
                </span>
              )}
              {topic.isSolved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm atlas-mono text-[10px] font-medium bg-atlas-success/10 text-atlas-success border border-atlas-success/30 uppercase tracking-[0.04em]">
                  <CheckCircle className="size-2.5" strokeWidth={1.75} />
                  Resolvido
                </span>
              )}
              {topic.isClosed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm atlas-mono text-[10px] font-medium bg-atlas-surface text-atlas-muted border border-atlas-line uppercase tracking-[0.04em]">
                  <Lock className="size-2.5" strokeWidth={1.75} />
                  Fechado
                </span>
              )}
            </div>
          )}

          <div className="p-6">
            <div className="flex gap-5">
              {/* Vote Section */}
              <div className="hidden sm:block flex-shrink-0 pt-1">
                <VoteButtons
                  type="topic"
                  id={topic.id}
                  initialUpvotes={topic.upvotes}
                  initialDownvotes={topic.downvotes}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                    {topic.title}
                  </h1>

                  {/* Menu de ações do tópico */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {/* Ações do autor */}
                      {(isTopicAuthor || isAdmin) && (
                        <>
                          <DropdownMenuItem onClick={handleEditTopic} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar tópico
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleDeleteTopic}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar tópico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      {/* Ações de admin */}
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={handleTogglePin} className="cursor-pointer">
                            <Pin className="mr-2 h-4 w-4" />
                            {topic.isPinned ? 'Desafixar' : 'Fixar tópico'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleToggleClose} className="cursor-pointer">
                            <Lock className="mr-2 h-4 w-4" />
                            {topic.isClosed ? 'Reabrir' : 'Fechar tópico'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleToggleSolved} className="cursor-pointer">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {topic.isSolved ? 'Desmarcar resolvido' : 'Marcar como resolvido'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      {/* Denúncia (todos os usuários) */}
                      {!isTopicAuthor && (
                        <DropdownMenuItem
                          onClick={() => setIsReportDialogOpen(true)}
                          className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 cursor-pointer"
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          Denunciar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-5">
                  <p className="whitespace-pre-wrap">{topic.content}</p>
                </div>

                {/* Related Video */}
                {topic.video && (
                  <div className="mb-5 flex items-center gap-2.5 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <PlayCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-blue-600 font-medium">Relacionado ao vídeo</p>
                      <Link
                        href={`/student/courses/${topic.video.id}`}
                        className="text-sm font-semibold text-blue-700 hover:underline truncate block"
                      >
                        {topic.video.title}
                      </Link>
                    </div>
                  </div>
                )}

                {/* Author & Meta */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                      {topic.author.profile?.photoUrl ? (
                        <img src={topic.author.profile.photoUrl} alt={topic.author.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-blue-700">
                          {topic.author.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{topic.author.name}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(topic.createdAt), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-auto text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {topic.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {replyCount}
                    </span>
                  </div>

                  {/* Mobile votes */}
                  <div className="sm:hidden w-full pt-3">
                    <VoteButtons
                      type="topic"
                      id={topic.id}
                      initialUpvotes={topic.upvotes}
                      initialDownvotes={topic.downvotes}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {replyCount === 0
                ? 'Nenhuma resposta'
                : `${replyCount} ${replyCount === 1 ? 'resposta' : 'respostas'}`}
            </h2>
          </div>

          {topic.replies && topic.replies.length > 0 ? (
            <StaggerContainer className="space-y-3">
              {topic.replies.map((reply) => (
                <StaggerItem key={reply.id}>
                  <ReplyCard
                    reply={reply}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onEdit={handleEditReply}
                    onDelete={handleDeleteReply}
                    onVoteChange={loadTopic}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
              <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma resposta ainda</p>
              <p className="text-sm text-gray-400 mt-1">Seja o primeiro a responder!</p>
            </div>
          )}
        </div>

        {/* Reply Form */}
        {!topic.isClosed ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Sua Resposta</h3>
            <form onSubmit={handleSubmitReply}>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Compartilhe seu conhecimento ou tire uma dúvida..."
                className="min-h-[120px] mb-4 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-500/20 resize-none"
                disabled={submitting}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Seja respeitoso e construtivo em suas respostas
                </p>
                <Button
                  type="submit"
                  disabled={submitting || !replyContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1.5" />
                      Responder
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
            <Lock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500 font-medium">
              Este tópico está fechado e não aceita mais respostas
            </p>
          </div>
        )}
      </div>

    {/* Dialog: Editar Tópico */}
    <Dialog open={isEditingTopic} onOpenChange={setIsEditingTopic}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Tópico</DialogTitle>
          <DialogDescription>Atualize o título e conteúdo do tópico</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={editTopicTitle}
              onChange={(e) => setEditTopicTitle(e.target.value)}
              placeholder="Título do tópico"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-content">Conteúdo</Label>
            <Textarea
              id="edit-content"
              value={editTopicContent}
              onChange={(e) => setEditTopicContent(e.target.value)}
              placeholder="Conteúdo do tópico"
              className="min-h-[150px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditingTopic(false)} disabled={savingTopic}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEditTopic} disabled={savingTopic || !editTopicTitle.trim() || !editTopicContent.trim()}>
            {savingTopic ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog: Editar Resposta */}
    <Dialog open={!!editingReply} onOpenChange={(open) => !open && setEditingReply(null)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Resposta</DialogTitle>
          <DialogDescription>Atualize o conteúdo da sua resposta</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={editReplyContent}
            onChange={(e) => setEditReplyContent(e.target.value)}
            placeholder="Conteúdo da resposta"
            className="min-h-[150px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingReply(null)} disabled={savingReply}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEditReply} disabled={savingReply || !editReplyContent.trim()}>
            {savingReply ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog: Denúncia */}
    <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Denunciar Tópico
          </DialogTitle>
          <DialogDescription>
            Ajude-nos a manter a comunidade segura reportando conteúdo inadequado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo da denúncia *</Label>
            <Select value={reportReason} onValueChange={(v) => setReportReason(v as ReportReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Descreva o problema com mais detalhes..."
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} disabled={submittingReport}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={submittingReport || !reportReason}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {submittingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
            Enviar Denúncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </main>
  );
}
