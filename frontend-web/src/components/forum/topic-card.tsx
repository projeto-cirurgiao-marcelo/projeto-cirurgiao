import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Pin,
  Lock,
  CheckCircle,
  Eye,
  MessageSquare,
  PlayCircle,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ForumTopic } from '@/lib/types/forum.types';

interface TopicCardProps {
  topic: ForumTopic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const replyCount = topic._count?.replies || 0;
  const score = topic.upvotes - topic.downvotes;

  return (
    <Link
      href={`/student/forum/topic/${topic.id}`}
      className={cn(
        'group block bg-atlas-surface border rounded-md transition-colors duration-150 hover:bg-atlas-surface-2',
        topic.isPinned
          ? 'border-l-[3px] border-l-atlas-warn border-atlas-line'
          : 'border-atlas-line',
      )}
    >
      <div className="p-4 sm:p-5 flex gap-4">
        {/* Vote Score (desktop) */}
        <div className="hidden sm:flex flex-col items-center shrink-0">
          <div
            className={cn(
              'w-12 rounded-md border px-2 py-2 text-center bg-atlas-surface',
              score > 0 && 'border-atlas-success/40',
              score < 0 && 'border-atlas-accent/40',
              score === 0 && 'border-atlas-line',
            )}
          >
            <ChevronUp
              className={cn(
                'size-3.5 mx-auto mb-0.5',
                score > 0 ? 'text-atlas-success' : 'text-atlas-muted-2',
              )}
              strokeWidth={1.75}
            />
            <span
              className={cn(
                'font-mono text-[15px] font-medium leading-none block atlas-num',
                score > 0 && 'text-atlas-success',
                score < 0 && 'text-atlas-accent',
                score === 0 && 'text-atlas-muted',
              )}
            >
              {score}
            </span>
            <span className="atlas-mono text-[9px] text-atlas-muted-2 uppercase tracking-[0.06em] mt-1 block">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm atlas-mono text-[10px] font-medium bg-atlas-surface-2 text-atlas-muted border border-atlas-line uppercase tracking-[0.04em]">
                  <Lock className="size-2.5" strokeWidth={1.75} />
                  Fechado
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-serif text-[15px] sm:text-base font-medium tracking-[-0.005em] text-atlas-ink leading-[1.3] line-clamp-2">
            {topic.title}
          </h3>

          {/* Content Preview */}
          <p className="text-[13px] text-atlas-muted mt-1.5 line-clamp-1 leading-[1.55]">
            {topic.content}
          </p>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
            {/* Author */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-6 rounded-full bg-atlas-primary text-white flex items-center justify-center shrink-0">
                <span className="atlas-mono text-[10px] font-semibold tracking-tight">
                  {topic.author.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[13px] font-medium text-atlas-ink-2 truncate">
                {topic.author.name}
              </span>
              <span className="atlas-mono text-[10.5px] text-atlas-muted-2 tracking-[0.04em]">
                {formatDistanceToNow(new Date(topic.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-atlas-muted-2 ml-auto">
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3" strokeWidth={1.75} />
                <span className="atlas-mono atlas-num font-medium text-atlas-ink-2">
                  {replyCount}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3" strokeWidth={1.75} />
                <span className="atlas-mono atlas-num font-medium text-atlas-ink-2">
                  {topic.views}
                </span>
              </span>
              {/* Mobile score */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 sm:hidden',
                  score > 0
                    ? 'text-atlas-success'
                    : score < 0
                      ? 'text-atlas-accent'
                      : 'text-atlas-muted-2',
                )}
              >
                <ChevronUp className="size-3" strokeWidth={1.75} />
                <span className="atlas-mono atlas-num font-medium">
                  {score}
                </span>
              </span>
            </div>
          </div>

          {/* Related Video */}
          {topic.video && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-atlas-line">
              <PlayCircle
                className="size-3.5 text-atlas-primary shrink-0"
                strokeWidth={1.75}
              />
              <span className="atlas-caps text-atlas-muted-2">Sobre:</span>
              <span className="text-[12.5px] font-medium text-atlas-primary-2 truncate">
                {topic.video.title}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
