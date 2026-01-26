'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { likesService, LikeStatus } from '@/lib/api/likes.service';
import { cn } from '@/lib/utils';

interface VideoLikeButtonProps {
  videoId: string;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export function VideoLikeButton({
  videoId,
  className,
  showCount = true,
  size = 'default',
}: VideoLikeButtonProps) {
  const [likeStatus, setLikeStatus] = useState<LikeStatus>({
    totalLikes: 0,
    userHasLiked: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Carregar status inicial
  useEffect(() => {
    loadLikeStatus();
  }, [videoId]);

  const loadLikeStatus = async () => {
    try {
      const status = await likesService.getLikeStatus(videoId);
      setLikeStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status de likes:', error);
    }
  };

  const handleToggleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setIsAnimating(true);

    // Otimistic update
    const previousStatus = { ...likeStatus };
    setLikeStatus({
      totalLikes: likeStatus.userHasLiked
        ? likeStatus.totalLikes - 1
        : likeStatus.totalLikes + 1,
      userHasLiked: !likeStatus.userHasLiked,
    });

    try {
      const newStatus = await likesService.toggleLike(videoId);
      setLikeStatus(newStatus);
    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error);
      // Reverter em caso de erro
      setLikeStatus(previousStatus);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Formatar número de likes (ex: 1.2K, 10K, 1M)
  const formatLikes = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <Button
      variant={likeStatus.userHasLiked ? 'default' : 'outline'}
      size={size}
      onClick={handleToggleLike}
      disabled={isLoading}
      className={cn(
        'transition-all duration-200',
        likeStatus.userHasLiked
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
          : 'border-gray-300 hover:border-blue-400 hover:text-blue-600',
        isAnimating && 'scale-110',
        className
      )}
    >
      <ThumbsUp
        className={cn(
          iconSize,
          'transition-transform duration-200',
          likeStatus.userHasLiked && 'fill-current',
          isAnimating && 'animate-bounce'
        )}
      />
      {showCount && (
        <span className={cn('ml-1.5 font-semibold', textSize)}>
          {formatLikes(likeStatus.totalLikes)}
        </span>
      )}
    </Button>
  );
}

// Versão Badge (apenas exibição, sem interação)
interface VideoLikeBadgeProps {
  videoId: string;
  className?: string;
}

export function VideoLikeBadge({ videoId, className }: VideoLikeBadgeProps) {
  const [likeStatus, setLikeStatus] = useState<LikeStatus>({
    totalLikes: 0,
    userHasLiked: false,
  });

  useEffect(() => {
    loadLikeStatus();
  }, [videoId]);

  const loadLikeStatus = async () => {
    try {
      const status = await likesService.getLikeStatus(videoId);
      setLikeStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status de likes:', error);
    }
  };

  const formatLikes = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-blue-50 text-blue-700 border border-blue-200',
        'text-sm font-semibold',
        className
      )}
    >
      <ThumbsUp className="h-4 w-4" />
      <span>{formatLikes(likeStatus.totalLikes)}</span>
    </div>
  );
}
