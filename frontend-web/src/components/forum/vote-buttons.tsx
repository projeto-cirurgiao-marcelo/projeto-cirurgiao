'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forumService } from '@/lib/api/forum.service';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';

interface VoteButtonsProps {
  type: 'topic' | 'reply';
  id: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  userVote?: number | null;
  onVoteChange?: () => void;
}

export function VoteButtons({
  type,
  id,
  initialUpvotes = 0,
  initialDownvotes = 0,
  userVote = null,
  onVoteChange,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<number | null>(userVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (value: number) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const newVote = currentVote === value ? null : value;

      if (currentVote === 1) {
        setUpvotes((prev) => prev - 1);
      } else if (currentVote === -1) {
        setDownvotes((prev) => prev - 1);
      }

      if (newVote === 1) {
        setUpvotes((prev) => prev + 1);
      } else if (newVote === -1) {
        setDownvotes((prev) => prev + 1);
      }

      setCurrentVote(newVote);

      if (type === 'topic') {
        await forumService.voteOnTopic({ topicId: id, value });
      } else {
        await forumService.voteOnReply({ replyId: id, value });
      }

      onVoteChange?.();
    } catch (error) {
      setUpvotes(initialUpvotes);
      setDownvotes(initialDownvotes);
      setCurrentVote(userVote);

      toast.error('Erro ao votar. Tente novamente.');
      logger.error('Erro ao votar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
          currentVote === 1
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-150'
            : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
        )}
      >
        <ChevronUp className={cn('w-4 h-4', currentVote === 1 && 'text-emerald-600')} />
        <span>{upvotes}</span>
      </button>

      <span className={cn(
        'text-sm font-bold px-1.5 min-w-[24px] text-center tabular-nums',
        score > 0 && 'text-emerald-600',
        score < 0 && 'text-red-500',
        score === 0 && 'text-gray-400'
      )}>
        {score > 0 && '+'}
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
          currentVote === -1
            ? 'bg-red-100 text-red-600 hover:bg-red-150'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
        )}
      >
        <ChevronDown className={cn('w-4 h-4', currentVote === -1 && 'text-red-500')} />
        <span>{downvotes}</span>
      </button>
    </div>
  );
}
