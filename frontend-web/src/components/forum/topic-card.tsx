import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pin, Lock, CheckCircle, Eye, MessageSquare, ThumbsUp, ThumbsDown, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ForumTopic } from '@/lib/types/forum.types';

interface TopicCardProps {
  topic: ForumTopic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const replyCount = topic._count?.replies || 0;
  const score = topic.upvotes - topic.downvotes;

  return (
    <Link href={`/student/forum/topic/${topic.id}`} className="group block">
      <div className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
        {/* Borda superior colorida */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Score Premium */}
            <div className={cn(
              'flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 transition-all',
              score > 0 && 'bg-green-50 border-green-200 text-green-700',
              score < 0 && 'bg-red-50 border-red-200 text-red-700',
              score === 0 && 'bg-gray-50 border-gray-200 text-gray-600'
            )}>
              <span className="text-xl font-bold leading-none">
                {score > 0 && '+'}
                {score}
              </span>
              <span className="text-[10px] font-medium mt-0.5 uppercase tracking-wide">
                votos
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Badges */}
              {(topic.isPinned || topic.isClosed || topic.isSolved) && (
                <div className="flex flex-wrap items-center gap-2">
                  {topic.isPinned && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 font-semibold">
                      <Pin className="h-3 w-3 mr-1" />
                      Fixado
                    </Badge>
                  )}
                  {topic.isClosed && (
                    <Badge variant="outline" className="border-gray-300 text-gray-700 font-semibold">
                      <Lock className="h-3 w-3 mr-1" />
                      Fechado
                    </Badge>
                  )}
                  {topic.isSolved && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 font-semibold">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolvido
                    </Badge>
                  )}
                </div>
              )}

              {/* Título */}
              <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-2 group-hover:text-primary-600 transition-colors">
                {topic.title}
              </h3>

              {/* Preview do conteúdo */}
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {topic.content}
              </p>

              {/* Metadados */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {/* Autor e data */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-700">
                      {topic.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-gray-700">{topic.author.name}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(topic.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{topic.views}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{replyCount}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="font-medium">{topic.upvotes}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      <span className="font-medium">{topic.downvotes}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vídeo associado */}
              {topic.video && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-primary-600">
                    <PlayCircle className="h-4 w-4" />
                    <span className="font-medium">Relacionado ao vídeo:</span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium truncate">
                    {topic.video.title}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
