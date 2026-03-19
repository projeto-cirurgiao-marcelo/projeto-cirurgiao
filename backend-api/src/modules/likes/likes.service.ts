import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

export interface LikeStatus {
  totalLikes: number;
  userHasLiked: boolean;
}

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    private gamificationService: GamificationService,
  ) {}

  /**
   * Obter status de likes de um vídeo
   */
  async getLikeStatus(videoId: string, userId?: string): Promise<LikeStatus> {
    // Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Contar total de likes
    const totalLikes = await this.prisma.videoLike.count({
      where: { videoId },
    });

    // Verificar se o usuário já curtiu (se userId fornecido)
    let userHasLiked = false;
    if (userId) {
      const userLike = await this.prisma.videoLike.findUnique({
        where: {
          videoId_userId: {
            videoId,
            userId,
          },
        },
      });
      userHasLiked = !!userLike;
    }

    return {
      totalLikes,
      userHasLiked,
    };
  }

  /**
   * Curtir um vídeo
   */
  async likeVideo(videoId: string, userId: string): Promise<LikeStatus> {
    // Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Verificar se já curtiu
    const existingLike = await this.prisma.videoLike.findUnique({
      where: {
        videoId_userId: {
          videoId,
          userId,
        },
      },
    });

    if (!existingLike) {
      // Criar o like
      await this.prisma.videoLike.create({
        data: {
          videoId,
          userId,
        },
      });

      // Gamificação
      try {
        await this.gamificationService.processAction(userId, 'video_like', 2, 'Curtiu um vídeo', videoId);
      } catch (err) { /* gamification should not break likes */ }
    }

    // Retornar status atualizado
    return this.getLikeStatus(videoId, userId);
  }

  /**
   * Descurtir um vídeo
   */
  async unlikeVideo(videoId: string, userId: string): Promise<LikeStatus> {
    // Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Remover o like se existir
    await this.prisma.videoLike.deleteMany({
      where: {
        videoId,
        userId,
      },
    });

    // Retornar status atualizado
    return this.getLikeStatus(videoId, userId);
  }

  /**
   * Toggle like (curtir/descurtir)
   */
  async toggleLike(videoId: string, userId: string): Promise<LikeStatus> {
    const status = await this.getLikeStatus(videoId, userId);

    if (status.userHasLiked) {
      return this.unlikeVideo(videoId, userId);
    } else {
      return this.likeVideo(videoId, userId);
    }
  }
}
