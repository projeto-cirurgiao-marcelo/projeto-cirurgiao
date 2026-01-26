'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { forumService } from '@/lib/api/forum.service';
import { ForumTopic } from '@/lib/types/forum.types';
import { VoteButtons } from '@/components/forum/vote-buttons';
import { ReplyCard } from '@/components/forum/reply-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Pin, Lock, CheckCircle, Eye, MessageSquare, Send } from 'lucide-react';
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
      await loadTopic(); // Recarregar para mostrar nova resposta
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">{error || 'Tópico não encontrado'}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const scoreColor = topic.upvotes - topic.downvotes > 0 
    ? 'text-green-600' 
    : topic.upvotes - topic.downvotes < 0 
    ? 'text-red-600' 
    : 'text-muted-foreground';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumbs */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/student/forum" className="hover:text-foreground">
          Fórum
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
        <span className="text-foreground">{topic.title}</span>
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
            <h1 className="text-2xl font-bold mb-4">{topic.title}</h1>

            {/* Content */}
            <div className="prose prose-sm max-w-none mb-4">
              <p className="whitespace-pre-wrap">{topic.content}</p>
            </div>

            {/* Video Link */}
            {topic.video && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-1">Relacionado ao vídeo:</p>
                <Link 
                  href={`/student/courses/${topic.video.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {topic.video.title}
                </Link>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Por <span className="font-medium">{topic.author.name}</span></span>
              <span>•</span>
              <span>{format(new Date(topic.createdAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {topic.views} visualizações
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {topic._count?.replies || 0} respostas
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
            Este tópico está fechado e não aceita mais respostas
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
