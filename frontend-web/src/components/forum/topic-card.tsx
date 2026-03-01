import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pin, Lock, CheckCircle, Eye, MessageSquare, ThumbsUp, ThumbsDown, PlayCircle, ChevronUp } from 'lucide-react';
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
      <div className={cn(
        'relative bg-white rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        topic.isPinned ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 hover:border-blue-200'
      )}>
        <div className="p-5">
          <div className="flex gap-4">
            {/* Vote Score */}
            <div className="hidden sm:flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className={cn(
                'w-12 rounded-lg border px-2 py-2.5 text-center transition-colors',
                score > 0 && 'bg-emerald-50 border-emerald-200',
                score < 0 && 'bg-red-50 border-red-200',
                score === 0 && 'bg-gray-50 border-gray-200'
              )}>
                <ChevronUp className={cn(
                  'w-4 h-4 mx-auto mb-0.5',
                  score > 0 ? 'text-emerald-500' : 'text-gray-300'
                )} />
                <span className={cn(
                  'text-lg font-bold leading-none block',
                  score > 0 && 'text-emerald-700',
                  score < 0 && 'text-red-600',
                  score === 0 && 'text-gray-500'
                )}>
                  {score}
                </span>
                <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-0.5 block">
                  votos
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Status Badges */}
              {(topic.isPinned || topic.isClosed || topic.isSolved) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {topic.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      <Pin className="h-3 w-3" />
                      Fixado
                    </span>
                  )}
                  {topic.isSolved && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="h-3 w-3" />
                      Resolvido
                    </span>
                  )}
                  {topic.isClosed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      <Lock className="h-3 w-3" />
                      Fechado
                    </span>
                  )}
                </div>
              )}

              {/* Title */}
              <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                {topic.title}
              </h3>

              {/* Content Preview */}
              <p className="text-sm text-gray-500 mt-1 line-clamp-1 leading-relaxed">
                {topic.content}
              </p>

              {/* Footer */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-blue-700">
                      {topic.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{topic.author.name}</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(topic.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-400 ml-auto">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="font-medium text-gray-500">{replyCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-medium text-gray-500">{topic.views}</span>
                  </span>
                  {/* Mobile vote score */}
                  <span className={cn(
                    'flex items-center gap-1 sm:hidden',
                    score > 0 ? 'text-emerald-500' : score < 0 ? 'text-red-500' : 'text-gray-400'
                  )}>
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="font-medium">{score}</span>
                  </span>
                </div>
              </div>

              {/* Related Video */}
              {topic.video && (
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
                  <PlayCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-gray-500">Sobre:</span>
                  <span className="text-xs font-medium text-blue-600 truncate">
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
