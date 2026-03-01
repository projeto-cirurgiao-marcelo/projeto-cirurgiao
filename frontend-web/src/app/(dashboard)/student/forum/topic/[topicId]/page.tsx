'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { ForumTopic } from '@/lib/types/forum.types';
import { VoteButtons } from '@/components/forum/vote-buttons';
import { ReplyCard } from '@/components/forum/reply-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
} from 'lucide-react';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/shared/page-transition';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  const { toast } = useToast();

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      console.error('Erro ao carregar tópico:', err);
      setError('Erro ao carregar tópico');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando tópico...</p>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 font-medium">{error || 'Tópico não encontrado'}</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const replyCount = topic._count?.replies || 0;

  return (
    <PageTransition>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
          <Link href="/student/forum" className="text-gray-400 hover:text-blue-600 transition-colors font-medium">
            Fórum
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          {topic.category && (
            <>
              <Link
                href={`/student/forum/${topic.category.id}`}
                className="text-gray-400 hover:text-blue-600 transition-colors font-medium"
              >
                {topic.category.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            </>
          )}
          <span className="text-gray-700 font-medium truncate max-w-[200px]">{topic.title}</span>
        </nav>

        {/* Topic Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          {/* Status Badges Bar */}
          {(topic.isPinned || topic.isClosed || topic.isSolved) && (
            <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 border-b border-gray-100">
              {topic.isPinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-700">
                  <Pin className="h-3 w-3" />
                  Fixado
                </span>
              )}
              {topic.isSolved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  Resolvido
                </span>
              )}
              {topic.isClosed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-200 text-gray-600">
                  <Lock className="h-3 w-3" />
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
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight mb-4">
                  {topic.title}
                </h1>

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
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-700">
                        {topic.author.name.charAt(0).toUpperCase()}
                      </span>
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
    </div>
    </PageTransition>
  );
}
