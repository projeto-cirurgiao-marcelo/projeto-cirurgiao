'use client';

import { useEffect, useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { likesService, LikeStatus } from '@/lib/api/likes.service';
import { AtlasButton } from '@/components/atlas';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface VideoLikeButtonProps {
  videoId: string;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

function formatLikes(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

const SIZE_MAP: Record<'sm' | 'default' | 'lg', 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  default: 'md',
  lg: 'lg',
};

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

  useEffect(() => {
    void loadLikeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadLikeStatus = async () => {
    try {
      const status = await likesService.getLikeStatus(videoId);
      setLikeStatus(status);
    } catch (error) {
      logger.error('Erro ao carregar status de likes:', error);
    }
  };

  const handleToggleLike = async () => {
    if (isLoading) return;
    setIsLoading(true);

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
      logger.error('Erro ao curtir/descurtir:', error);
      setLikeStatus(previousStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const liked = likeStatus.userHasLiked;
  const atlasSize = SIZE_MAP[size];

  return (
    <AtlasButton
      variant={liked ? 'primary' : 'outline'}
      size={atlasSize}
      onClick={handleToggleLike}
      disabled={isLoading}
      aria-pressed={liked}
      className={className}
    >
      <ThumbsUp
        strokeWidth={1.75}
        fill={liked ? 'currentColor' : 'none'}
      />
      {showCount && (
        <span
          className={cn(
            'atlas-mono atlas-num',
            size === 'sm' && 'text-[11.5px]',
            size === 'default' && 'text-[12px]',
            size === 'lg' && 'text-[13px]',
          )}
        >
          {formatLikes(likeStatus.totalLikes)}
        </span>
      )}
    </AtlasButton>
  );
}

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
    void loadLikeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadLikeStatus = async () => {
    try {
      const status = await likesService.getLikeStatus(videoId);
      setLikeStatus(status);
    } catch (error) {
      logger.error('Erro ao carregar status de likes:', error);
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm',
        'bg-atlas-primary-soft text-atlas-primary-2 border border-atlas-line',
        className,
      )}
    >
      <ThumbsUp className="size-3.5" strokeWidth={1.75} />
      <span className="atlas-mono atlas-num text-[11.5px]">
        {formatLikes(likeStatus.totalLikes)}
      </span>
    </div>
  );
}
