'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { forumService } from '@/lib/api/forum.service';
import { toast } from 'sonner';

interface VoteButtonsProps {
  type: 'topic' | 'reply';
  id: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  userVote?: number | null; // 1, -1, ou null
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
      // Se clicar no mesmo voto, remove (toggle)
      const newVote = currentVote === value ? null : value;

      // Atualizar UI otimisticamente
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

      // Chamar API
      if (type === 'topic') {
        await forumService.voteOnTopic({ topicId: id, value });
      } else {
        await forumService.voteOnReply({ replyId: id, value });
      }

      onVoteChange?.();
    } catch (error) {
      // Reverter em caso de erro
      setUpvotes(initialUpvotes);
      setDownvotes(initialDownvotes);
      setCurrentVote(userVote);
      
      toast.error('Erro ao votar. Tente novamente.');
      console.error('Erro ao votar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={cn(
          'gap-1.5 transition-colors',
          currentVote === 1 && 'text-green-600 hover:text-green-700'
        )}
      >
        <ThumbsUp className={cn('h-4 w-4', currentVote === 1 && 'fill-current')} />
        <span className="text-sm font-medium">{upvotes}</span>
      </Button>

      <div className={cn(
        'text-sm font-semibold px-2',
        score > 0 && 'text-green-600',
        score < 0 && 'text-red-600',
        score === 0 && 'text-muted-foreground'
      )}>
        {score > 0 && '+'}
        {score}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={cn(
          'gap-1.5 transition-colors',
          currentVote === -1 && 'text-red-600 hover:text-red-700'
        )}
      >
        <ThumbsDown className={cn('h-4 w-4', currentVote === -1 && 'fill-current')} />
        <span className="text-sm font-medium">{downvotes}</span>
      </Button>
    </div>
  );
}
