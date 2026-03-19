import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private gamificationService: GamificationService,
  ) {}

  /**
   * Criar uma nova nota para um vídeo
   */
  async create(videoId: string, userId: string, createNoteDto: CreateNoteDto) {
    // Verificar se o vídeo existe
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Vídeo não encontrado');
    }

    // Criar a nota
    const note = await this.prisma.videoNote.create({
      data: {
        videoId,
        userId,
        content: createNoteDto.content,
        timestamp: createNoteDto.timestamp,
      },
    });

    // Gamificação
    try {
      await this.gamificationService.processAction(userId, 'video_note', 5, 'Criou anotação', note.id);
    } catch (err) { /* gamification should not break notes */ }

    return note;
  }

  /**
   * Listar todas as notas do usuário para um vídeo
   */
  async findByVideo(videoId: string, userId: string) {
    const notes = await this.prisma.videoNote.findMany({
      where: {
        videoId,
        userId,
      },
      orderBy: [
        { timestamp: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return notes;
  }

  /**
   * Buscar uma nota específica
   */
  async findOne(noteId: string, userId: string) {
    const note = await this.prisma.videoNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Nota não encontrada');
    }

    // Verificar se a nota pertence ao usuário
    if (note.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta nota');
    }

    return note;
  }

  /**
   * Atualizar uma nota
   */
  async update(noteId: string, userId: string, updateNoteDto: UpdateNoteDto) {
    // Verificar se a nota existe e pertence ao usuário
    const existingNote = await this.findOne(noteId, userId);

    const updatedNote = await this.prisma.videoNote.update({
      where: { id: noteId },
      data: {
        content: updateNoteDto.content ?? existingNote.content,
        timestamp: updateNoteDto.timestamp ?? existingNote.timestamp,
      },
    });

    return updatedNote;
  }

  /**
   * Excluir uma nota
   */
  async delete(noteId: string, userId: string) {
    // Verificar se a nota existe e pertence ao usuário
    await this.findOne(noteId, userId);

    await this.prisma.videoNote.delete({
      where: { id: noteId },
    });

    return { message: 'Nota excluída com sucesso' };
  }

  /**
   * Contar notas do usuário para um vídeo
   */
  async countByVideo(videoId: string, userId: string) {
    const count = await this.prisma.videoNote.count({
      where: {
        videoId,
        userId,
      },
    });

    return { count };
  }

  /**
   * Listar todas as notas do usuário (para todos os vídeos)
   */
  async findAllByUser(userId: string, limit?: number) {
    const notes = await this.prisma.videoNote.findMany({
      where: { userId },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notes;
  }
}
