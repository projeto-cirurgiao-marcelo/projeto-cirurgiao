import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { VoteTopicDto, VoteReplyDto } from './dto/vote.dto';

@Injectable()
export class ForumService {
  constructor(
    private prisma: PrismaService,
    private gamificationService: GamificationService,
  ) {}

  // ==================== TÓPICOS ====================

  /**
   * Criar novo tópico
   */
  async createTopic(userId: string, createTopicDto: CreateTopicDto) {
    // Verificar se a categoria existe
    const category = await this.prisma.forumCategory.findUnique({
      where: { id: createTopicDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    // Se videoId foi fornecido, verificar se existe
    if (createTopicDto.videoId) {
      const video = await this.prisma.video.findUnique({
        where: { id: createTopicDto.videoId },
      });

      if (!video) {
        throw new NotFoundException('Vídeo não encontrado');
      }
    }

    const topic = await this.prisma.forumTopic.create({
      data: {
        ...createTopicDto,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { photoUrl: true } },
          },
        },
        category: true,
        video: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
          },
        },
      },
    });

    // Gamificação
    try {
      await this.gamificationService.processAction(userId, 'forum_topic', 15, 'Criou tópico no fórum', topic.id);
    } catch (err) { /* gamification should not break forum */ }

    return topic;
  }

  /**
   * Listar tópicos (com filtros)
   */
  async findAllTopics(params?: {
    categoryId?: string;
    videoId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.categoryId) where.categoryId = params.categoryId;
    if (params?.videoId) where.videoId = params.videoId;

    const [topics, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isPinned: 'desc' }, // Fixados primeiro
          { createdAt: 'desc' }, // Mais recentes
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: true,
          video: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              replies: true,
              votes: true,
            },
          },
        },
      }),
      this.prisma.forumTopic.count({ where }),
    ]);

    return {
      data: topics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar tópico por ID
   */
  async findOneTopic(id: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { photoUrl: true } },
          },
        },
        category: true,
        video: {
          select: {
            id: true,
            title: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    // Incrementar visualizações
    await this.prisma.forumTopic.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return topic;
  }

  /**
   * Atualizar tópico
   */
  async updateTopic(
    userId: string,
    id: string,
    updateTopicDto: UpdateTopicDto,
    userRole: string,
  ) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    // Apenas o autor ou ADMIN pode editar
    if (topic.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para editar este tópico',
      );
    }

    // Se tópico está fechado, apenas ADMIN pode editar
    if (topic.isClosed && userRole !== 'ADMIN') {
      throw new BadRequestException('Este tópico está fechado');
    }

    return this.prisma.forumTopic.update({
      where: { id },
      data: updateTopicDto,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { photoUrl: true } },
          },
        },
        category: true,
      },
    });
  }

  /**
   * Deletar tópico
   */
  async removeTopic(userId: string, id: string, userRole: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    // Apenas o autor ou ADMIN pode deletar
    if (topic.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este tópico',
      );
    }

    return this.prisma.forumTopic.delete({
      where: { id },
    });
  }

  // ==================== RESPOSTAS ====================

  /**
   * Criar resposta
   */
  async createReply(userId: string, createReplyDto: CreateReplyDto) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: createReplyDto.topicId },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    if (topic.isClosed) {
      throw new BadRequestException(
        'Este tópico está fechado e não aceita novas respostas',
      );
    }

    const reply = await this.prisma.forumReply.create({
      data: {
        ...createReplyDto,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { photoUrl: true } },
          },
        },
      },
    });

    // Gamificação
    try {
      await this.gamificationService.processAction(userId, 'forum_reply', 10, 'Respondeu no fórum', reply.id);
    } catch (err) { /* gamification should not break forum */ }

    return reply;
  }

  /**
   * Atualizar resposta
   */
  async updateReply(
    userId: string,
    id: string,
    content: string,
    userRole: string,
  ) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id },
      include: { topic: true },
    });

    if (!reply) {
      throw new NotFoundException('Resposta não encontrada');
    }

    // Apenas o autor ou ADMIN pode editar
    if (reply.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta resposta',
      );
    }

    // Se tópico está fechado, apenas ADMIN pode editar
    if (reply.topic.isClosed && userRole !== 'ADMIN') {
      throw new BadRequestException('Este tópico está fechado');
    }

    return this.prisma.forumReply.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: { select: { photoUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Deletar resposta
   */
  async removeReply(userId: string, id: string, userRole: string) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id },
    });

    if (!reply) {
      throw new NotFoundException('Resposta não encontrada');
    }

    // Apenas o autor ou ADMIN pode deletar
    if (reply.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para deletar esta resposta',
      );
    }

    return this.prisma.forumReply.delete({
      where: { id },
    });
  }

  // ==================== VOTOS ====================

  /**
   * Votar em tópico
   */
  async voteOnTopic(userId: string, voteTopicDto: VoteTopicDto) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: voteTopicDto.topicId },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    const existingVote = await this.prisma.forumTopicVote.findFirst({
      where: { userId, topicId: voteTopicDto.topicId },
    });

    if (existingVote) {
      if (existingVote.value === voteTopicDto.value) {
        // Toggle: remover voto
        await this.prisma.forumTopicVote.delete({ where: { id: existingVote.id } });
        // Reverter contador
        await this.prisma.forumTopic.update({
          where: { id: voteTopicDto.topicId },
          data: existingVote.value === 1
            ? { upvotes: { decrement: 1 } }
            : { downvotes: { decrement: 1 } },
        });
        return { message: 'Voto removido' };
      }

      // Mudar voto (ex: upvote → downvote)
      await this.prisma.forumTopicVote.update({
        where: { id: existingVote.id },
        data: { value: voteTopicDto.value },
      });
      // Ajustar ambos contadores
      await this.prisma.forumTopic.update({
        where: { id: voteTopicDto.topicId },
        data: existingVote.value === 1
          ? { upvotes: { decrement: 1 }, downvotes: { increment: 1 } }
          : { upvotes: { increment: 1 }, downvotes: { decrement: 1 } },
      });
      return { message: 'Voto atualizado' };
    }

    // Novo voto
    await this.prisma.forumTopicVote.create({
      data: { userId, topicId: voteTopicDto.topicId, value: voteTopicDto.value },
    });
    // Incrementar contador
    await this.prisma.forumTopic.update({
      where: { id: voteTopicDto.topicId },
      data: voteTopicDto.value === 1
        ? { upvotes: { increment: 1 } }
        : { downvotes: { increment: 1 } },
    });

    // Gamificação: premiar o autor ao receber upvote
    if (voteTopicDto.value === 1 && topic.authorId !== userId) {
      try {
        await this.gamificationService.processAction(
          topic.authorId, 'forum_upvote', 5, 'Recebeu upvote em tópico', voteTopicDto.topicId,
        );
      } catch (err) { /* silencioso */ }
    }

    return { message: 'Voto registrado' };
  }

  /**
   * Votar em resposta
   */
  async voteOnReply(userId: string, voteReplyDto: VoteReplyDto) {
    const reply = await this.prisma.forumReply.findUnique({
      where: { id: voteReplyDto.replyId },
    });

    if (!reply) {
      throw new NotFoundException('Resposta não encontrada');
    }

    const existingVote = await this.prisma.forumReplyVote.findFirst({
      where: { userId, replyId: voteReplyDto.replyId },
    });

    if (existingVote) {
      if (existingVote.value === voteReplyDto.value) {
        // Toggle: remover voto
        await this.prisma.forumReplyVote.delete({ where: { id: existingVote.id } });
        await this.prisma.forumReply.update({
          where: { id: voteReplyDto.replyId },
          data: existingVote.value === 1
            ? { upvotes: { decrement: 1 } }
            : { downvotes: { decrement: 1 } },
        });
        return { message: 'Voto removido' };
      }

      // Mudar voto
      await this.prisma.forumReplyVote.update({
        where: { id: existingVote.id },
        data: { value: voteReplyDto.value },
      });
      await this.prisma.forumReply.update({
        where: { id: voteReplyDto.replyId },
        data: existingVote.value === 1
          ? { upvotes: { decrement: 1 }, downvotes: { increment: 1 } }
          : { upvotes: { increment: 1 }, downvotes: { decrement: 1 } },
      });
      return { message: 'Voto atualizado' };
    }

    // Novo voto
    await this.prisma.forumReplyVote.create({
      data: { userId, replyId: voteReplyDto.replyId, value: voteReplyDto.value },
    });
    await this.prisma.forumReply.update({
      where: { id: voteReplyDto.replyId },
      data: voteReplyDto.value === 1
        ? { upvotes: { increment: 1 } }
        : { downvotes: { increment: 1 } },
    });

    // Gamificação: premiar o autor ao receber upvote
    if (voteReplyDto.value === 1 && reply.authorId !== userId) {
      try {
        await this.gamificationService.processAction(
          reply.authorId, 'forum_upvote', 5, 'Recebeu upvote em resposta', voteReplyDto.replyId,
        );
      } catch (err) { /* silencioso */ }
    }

    return { message: 'Voto registrado' };
  }

  // ==================== SOLUÇÕES ====================

  /**
   * Marcar uma resposta como solução do tópico
   */
  async markReplyAsSolution(userId: string, topicId: string, replyId: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    // Apenas o autor do tópico ou admin pode marcar solução
    if (topic.authorId !== userId) {
      throw new ForbiddenException('Apenas o autor do tópico pode marcar uma solução');
    }

    const reply = await this.prisma.forumReply.findUnique({
      where: { id: replyId },
    });

    if (!reply || reply.topicId !== topicId) {
      throw new NotFoundException('Resposta não encontrada neste tópico');
    }

    // Desmarcar qualquer solução anterior
    await this.prisma.forumReply.updateMany({
      where: { topicId, isSolution: true },
      data: { isSolution: false },
    });

    // Marcar a nova solução
    await this.prisma.forumReply.update({
      where: { id: replyId },
      data: { isSolution: true },
    });

    // Marcar tópico como resolvido
    await this.prisma.forumTopic.update({
      where: { id: topicId },
      data: { isSolved: true },
    });

    // Gamificação: premiar o autor da resposta-solução (se não for o próprio autor do tópico)
    if (reply.authorId !== topic.authorId) {
      try {
        await this.gamificationService.processAction(
          reply.authorId,
          'forum_solution',
          50,
          'Resposta marcada como solução',
          replyId,
        );
      } catch (err) {
        // Silencioso
      }
    }

    return { message: 'Resposta marcada como solução' };
  }

  // ==================== DENÚNCIAS ====================

  /**
   * Criar denúncia de um tópico
   */
  async reportTopic(userId: string, createReportDto: CreateReportDto) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: createReportDto.topicId },
    });

    if (!topic) {
      throw new NotFoundException('Tópico não encontrado');
    }

    // Verificar se o usuário já denunciou este tópico
    const existingReport = await this.prisma.forumReport.findUnique({
      where: {
        topicId_reporterId: {
          topicId: createReportDto.topicId,
          reporterId: userId,
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('Você já denunciou este tópico');
    }

    return this.prisma.forumReport.create({
      data: {
        ...createReportDto,
        reporterId: userId,
      },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Listar denúncias (apenas ADMIN)
   */
  async findAllReports(params?: { status?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.status) where.status = params.status;

    const [reports, total] = await Promise.all([
      this.prisma.forumReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          topic: {
            select: {
              id: true,
              title: true,
              authorId: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.forumReport.count({ where }),
    ]);

    return {
      data: reports,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
