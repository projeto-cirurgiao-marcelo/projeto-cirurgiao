import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { SaveProgressDto, UpdateProgressDto } from './dto/save-progress.dto';
import { Progress } from '@prisma/client';

// Interface para resposta de progresso do curso
export interface CourseProgressResponse {
  courseId: string;
  totalVideos: number;
  watchedVideos: number;
  completedVideos: number;
  totalWatchTime: number;
  progressPercentage: number;
  videos: VideoProgressItem[];
}

export interface VideoProgressItem {
  videoId: string;
  videoTitle: string;
  moduleId: string;
  moduleTitle: string;
  watched: boolean;
  completed: boolean;
  watchTime: number;
  videoDuration: number;
}

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private prisma: PrismaService,
    private gamificationService: GamificationService,
  ) {}

  /**
   * Salvar ou atualizar progresso de um vídeo
   * Também cria matrícula automaticamente se não existir
   */
  async saveProgress(userId: string, saveProgressDto: SaveProgressDto): Promise<Progress> {
    try {
      const { videoId, watchTime, completed, videoDuration } = saveProgressDto;

      // Verificar se o vídeo existe e obter o courseId
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
        include: {
          module: {
            select: {
              courseId: true,
            },
          },
        },
      });

      if (!video) {
        throw new NotFoundException('Vídeo não encontrado');
      }

      // Atualizar duração do vídeo se reportada pelo player e ainda não definida
      if (videoDuration && videoDuration > 0 && (!video.duration || video.duration === 0)) {
        await this.prisma.video.update({
          where: { id: videoId },
          data: { duration: Math.round(videoDuration) },
        });
        this.logger.log(`Video ${videoId} duration updated from player: ${Math.round(videoDuration)}s`);
      }

      // Criar matrícula automaticamente se não existir
      const courseId = video.module.courseId;
      await this.ensureEnrollment(userId, courseId);

      // Verificar se já existe progresso para este usuário/vídeo
      const existingProgress = await this.prisma.progress.findUnique({
        where: {
          userId_videoId: {
            userId,
            videoId,
          },
        },
      });

      const now = new Date();

      if (existingProgress) {
        // Atualizar progresso existente
        const updateData: any = {
          watchTime: Math.max(existingProgress.watchTime, watchTime), // Manter o maior tempo
          watched: true,
          watchedAt: existingProgress.watchedAt || now,
          updatedAt: now,
        };

        // Se marcou como completo, atualizar
        if (completed && !existingProgress.completed) {
          updateData.completed = true;
          updateData.completedAt = now;
        }

        const progress = await this.prisma.progress.update({
          where: { id: existingProgress.id },
          data: updateData,
        });

        this.logger.log(`Progress updated for user ${userId}, video ${videoId}`);
        
        // Atualizar progresso da matrícula
        await this.updateEnrollmentProgress(userId, courseId);
        
        return progress;
      } else {
        // Criar novo progresso
        const progress = await this.prisma.progress.create({
          data: {
            userId,
            videoId,
            watchTime,
            watched: true,
            watchedAt: now,
            completed: completed || false,
            completedAt: completed ? now : null,
          },
        });

        this.logger.log(`Progress created for user ${userId}, video ${videoId}`);
        
        // Atualizar progresso da matrícula
        await this.updateEnrollmentProgress(userId, courseId);
        
        return progress;
      }
    } catch (error) {
      this.logger.error('Error saving progress', error);
      throw error;
    }
  }

  /**
   * Buscar progresso de um vídeo específico
   */
  async getVideoProgress(userId: string, videoId: string): Promise<Progress | null> {
    // Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    return this.prisma.progress.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });
  }

  /**
   * Buscar progresso de todos os vídeos de um curso
   */
  async getCourseProgress(userId: string, courseId: string): Promise<CourseProgressResponse> {
    // Verificar se o curso existe
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            videos: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    // Coletar todos os IDs de vídeos do curso
    const allVideos: { video: any; module: any }[] = [];
    for (const module of course.modules) {
      for (const video of module.videos) {
        allVideos.push({ video, module });
      }
    }

    const videoIds = allVideos.map((v) => v.video.id);

    // Buscar progresso de todos os vídeos do usuário
    const progressRecords = await this.prisma.progress.findMany({
      where: {
        userId,
        videoId: { in: videoIds },
      },
    });

    // Criar mapa de progresso por videoId
    const progressMap = new Map<string, Progress>();
    for (const progress of progressRecords) {
      progressMap.set(progress.videoId, progress);
    }

    // Montar resposta
    const videos: VideoProgressItem[] = allVideos.map(({ video, module }) => {
      const progress = progressMap.get(video.id);
      return {
        videoId: video.id,
        videoTitle: video.title,
        moduleId: module.id,
        moduleTitle: module.title,
        watched: progress?.watched || false,
        completed: progress?.completed || false,
        watchTime: progress?.watchTime || 0,
        videoDuration: video.duration || 0,
      };
    });

    const totalVideos = videos.length;
    const watchedVideos = videos.filter((v) => v.watched).length;
    const completedVideos = videos.filter((v) => v.completed).length;
    const totalWatchTime = videos.reduce((sum, v) => sum + v.watchTime, 0);
    const progressPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

    return {
      courseId,
      totalVideos,
      watchedVideos,
      completedVideos,
      totalWatchTime,
      progressPercentage,
      videos,
    };
  }

  /**
   * Criar ou atualizar matrícula do usuário no curso
   */
  private async ensureEnrollment(userId: string, courseId: string): Promise<void> {
    try {
      const existingEnrollment = await this.prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

      if (!existingEnrollment) {
        await this.prisma.enrollment.create({
          data: {
            userId,
            courseId,
            enrolledAt: new Date(),
            lastAccessAt: new Date(),
            progress: 0,
          },
        });
        this.logger.log(`Enrollment created for user ${userId} in course ${courseId}`);
      } else {
        // Atualizar último acesso
        await this.prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { lastAccessAt: new Date() },
        });
      }
    } catch (error) {
      this.logger.error(`Error ensuring enrollment for user ${userId} in course ${courseId}`, error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  /**
   * Atualizar progresso da matrícula baseado nos vídeos concluídos
   */
  private async updateEnrollmentProgress(userId: string, courseId: string): Promise<void> {
    try {
      // Buscar todos os vídeos do curso
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              videos: true,
            },
          },
        },
      });

      if (!course) return;

      const allVideoIds: string[] = [];
      for (const module of course.modules) {
        for (const video of module.videos) {
          allVideoIds.push(video.id);
        }
      }

      if (allVideoIds.length === 0) return;

      // Contar vídeos concluídos (completed)
      const completedCount = await this.prisma.progress.count({
        where: {
          userId,
          videoId: { in: allVideoIds },
          completed: true,
        },
      });

      const progressPercentage = Math.round((completedCount / allVideoIds.length) * 100);

      // Verificar se o curso estava incompleto antes
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { userId, courseId },
      });
      const wasAlreadyCompleted = !!enrollment?.completedAt;

      // Atualizar matrícula
      await this.prisma.enrollment.updateMany({
        where: {
          userId,
          courseId,
        },
        data: {
          progress: progressPercentage,
          completedAt: progressPercentage === 100 ? new Date() : null,
        },
      });

      this.logger.log(`Enrollment progress updated: ${progressPercentage}% for user ${userId} in course ${courseId}`);

      // Gamificação: conceder XP por completar curso
      if (progressPercentage === 100 && !wasAlreadyCompleted) {
        try {
          await this.gamificationService.processAction(
            userId,
            'course_complete',
            500,
            'Completou um curso',
            courseId,
          );
        } catch (err) {
          this.logger.warn('Gamification course_complete failed', err);
        }
      }
    } catch (error) {
      this.logger.error(`Error updating enrollment progress`, error);
    }
  }

  /**
   * Marcar vídeo como completo
   */
  async markAsCompleted(userId: string, videoId: string): Promise<Progress> {
    try {
      this.logger.log(`markAsCompleted called - userId: ${userId}, videoId: ${videoId}`);
      
      // Validar parâmetros
      if (!userId) {
        throw new Error('userId é obrigatório');
      }
      if (!videoId) {
        throw new Error('videoId é obrigatório');
      }

      // Verificar se o vídeo existe e obter courseId e moduleId
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
        include: {
          module: {
            select: {
              id: true,
              courseId: true,
            },
          },
        },
      });

      if (!video) {
        throw new NotFoundException('Vídeo não encontrado');
      }

      // Criar matrícula automaticamente se não existir
      const courseId = video.module.courseId;
      await this.ensureEnrollment(userId, courseId);

      const now = new Date();

      // Verificar se já existe progresso
      const existingProgress = await this.prisma.progress.findUnique({
        where: {
          userId_videoId: {
            userId: userId,
            videoId: videoId,
          },
        },
      });

      let progress: Progress;

      if (existingProgress) {
        // Atualizar para completo
        progress = await this.prisma.progress.update({
          where: { id: existingProgress.id },
          data: {
            completed: true,
            completedAt: now,
            watched: true,
            watchedAt: existingProgress.watchedAt || now,
          },
        });
      } else {
        // Criar novo progresso como completo
        progress = await this.prisma.progress.create({
          data: {
            userId,
            videoId,
            watchTime: 0,
            watched: true,
            watchedAt: now,
            completed: true,
            completedAt: now,
          },
        });
      }

      // Atualizar progresso da matrícula
      await this.updateEnrollmentProgress(userId, courseId);

      // Gamificação: conceder XP por completar vídeo
      try {
        await this.gamificationService.processAction(
          userId,
          'video_complete',
          25,
          'Completou vídeo',
          videoId,
        );
      } catch (err) {
        this.logger.warn('Gamification processAction failed', err);
      }

      // Gamificação: verificar milestone de vídeos assistidos (a cada 10 vídeos)
      try {
        const totalCompleted = await this.prisma.progress.count({
          where: { userId, completed: true },
        });
        if (totalCompleted > 0 && totalCompleted % 10 === 0) {
          await this.gamificationService.processAction(
            userId,
            'video_milestone',
            5,
            `Marco: ${totalCompleted} vídeos assistidos`,
            `milestone_${totalCompleted}`,
          );
          this.logger.log(`Video milestone reached: ${totalCompleted} videos by user ${userId}`);
        }
      } catch (err) {
        this.logger.warn('Gamification video_milestone check failed', err);
      }

      // Gamificação: verificar se completou o módulo inteiro
      try {
        const moduleId = video.module.id;
        if (moduleId) {
          const moduleVideos = await this.prisma.video.findMany({
            where: { moduleId },
            select: { id: true },
          });
          const moduleVideoIds = moduleVideos.map(v => v.id);
          const completedInModule = await this.prisma.progress.count({
            where: {
              userId,
              videoId: { in: moduleVideoIds },
              completed: true,
            },
          });
          if (completedInModule === moduleVideoIds.length && moduleVideoIds.length > 0) {
            await this.gamificationService.processAction(
              userId,
              'module_complete',
              100,
              'Completou módulo',
              moduleId,
            );
            this.logger.log(`Module ${moduleId} completed by user ${userId} — 100 XP awarded`);
          }
        }
      } catch (err) {
        this.logger.warn('Gamification module_complete check failed', err);
      }

      return progress;
    } catch (error) {
      this.logger.error(`Error marking video ${videoId} as completed`, error);
      throw error;
    }
  }

  /**
   * Marcar vídeo como não completo
   */
  async markAsIncomplete(userId: string, videoId: string): Promise<Progress> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        module: {
          select: { courseId: true },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    const progress = await this.prisma.progress.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    if (!progress) {
      throw new NotFoundException('Progresso não encontrado');
    }

    const updated = await this.prisma.progress.update({
      where: { id: progress.id },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    // Recalcular progresso do enrollment
    await this.updateEnrollmentProgress(userId, video.module.courseId);

    return updated;
  }

  /**
   * Obter resumo de progresso do usuário em todos os cursos
   */
  async getUserProgressSummary(userId: string): Promise<{
    totalCourses: number;
    coursesInProgress: number;
    coursesCompleted: number;
    totalWatchTime: number;
  }> {
    // Buscar todas as matrículas do usuário
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                videos: true,
              },
            },
          },
        },
      },
    });

    // Buscar todo o progresso do usuário
    const allProgress = await this.prisma.progress.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, Progress>();
    for (const progress of allProgress) {
      progressMap.set(progress.videoId, progress);
    }

    let coursesInProgress = 0;
    let coursesCompleted = 0;
    let totalWatchTime = 0;

    for (const enrollment of enrollments) {
      const courseVideos: string[] = [];
      for (const module of enrollment.course.modules) {
        for (const video of module.videos) {
          courseVideos.push(video.id);
        }
      }

      const completedVideos = courseVideos.filter((videoId) => {
        const progress = progressMap.get(videoId);
        return progress?.completed;
      }).length;

      const watchedVideos = courseVideos.filter((videoId) => {
        const progress = progressMap.get(videoId);
        return progress?.watched;
      }).length;

      if (completedVideos === courseVideos.length && courseVideos.length > 0) {
        coursesCompleted++;
      } else if (watchedVideos > 0) {
        coursesInProgress++;
      }
    }

    totalWatchTime = allProgress.reduce((sum, p) => sum + p.watchTime, 0);

    return {
      totalCourses: enrollments.length,
      coursesInProgress,
      coursesCompleted,
      totalWatchTime,
    };
  }

  /**
   * Buscar cursos em que o usuário está matriculado com progresso
   */
  async getEnrolledCourses(userId: string): Promise<any[]> {
    // Buscar todas as matrículas do usuário com dados do curso
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            thumbnail: true,
            thumbnailVertical: true,
            thumbnailHorizontal: true,
            isPublished: true,
            price: true,
            modules: {
              include: {
                videos: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { lastAccessAt: 'desc' },
    });

    // Buscar todo o progresso do usuário
    const allProgress = await this.prisma.progress.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, Progress>();
    for (const progress of allProgress) {
      progressMap.set(progress.videoId, progress);
    }

    // Montar resposta com dados de progresso
    return enrollments.map((enrollment) => {
      const course = enrollment.course;
      
      // Calcular total de vídeos e vídeos assistidos/concluídos
      let totalVideos = 0;
      let watchedVideos = 0;
      let completedVideos = 0;
      const videoProgressItems: any[] = [];

      for (const module of course.modules) {
        for (const video of module.videos) {
          totalVideos++;
          const progress = progressMap.get(video.id);
          if (progress?.watched) watchedVideos++;
          if (progress?.completed) completedVideos++;

          // Incluir progresso por vídeo para "Continue de onde parou"
          if (progress?.watched) {
            videoProgressItems.push({
              videoId: video.id,
              videoTitle: video.title,
              moduleId: module.id,
              moduleTitle: module.title,
              watched: progress.watched,
              completed: progress.completed,
              watchTime: progress.watchTime,
              videoDuration: video.duration || 0,
            });
          }
        }
      }

      const progressPercentage = totalVideos > 0
        ? Math.round((completedVideos / totalVideos) * 100)
        : 0;

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        thumbnailVertical: course.thumbnailVertical,
        thumbnailHorizontal: course.thumbnailHorizontal,
        isPublished: course.isPublished,
        price: course.price,
        instructor: course.instructor,
        modules: course.modules,
        enrollment: {
          id: enrollment.id,
          enrolledAt: enrollment.enrolledAt,
          lastAccessAt: enrollment.lastAccessAt,
          completedAt: enrollment.completedAt,
          progress: enrollment.progress,
        },
        progress: {
          totalVideos,
          watchedVideos,
          completedVideos,
          percentage: progressPercentage,
          videos: videoProgressItems,
        },
      };
    });
  }
}
