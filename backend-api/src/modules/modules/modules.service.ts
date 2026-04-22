import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { Module } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareR2: CloudflareR2Service,
    private audit: AuditService,
  ) {}

  /**
   * Criar um novo módulo
   */
  async create(courseId: string, createModuleDto: CreateModuleDto): Promise<Module> {
    try {
      // Verificar se o curso existe
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Curso não encontrado');
      }

      // Verificar se já existe um módulo com a mesma ordem
      const existingModule = await this.prisma.module.findFirst({
        where: {
          courseId,
          order: createModuleDto.order,
        },
      });

      if (existingModule) {
        throw new BadRequestException('Já existe um módulo com esta ordem neste curso');
      }

      const module = await this.prisma.module.create({
        data: {
          ...createModuleDto,
          courseId,
        },
        include: {
          videos: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log(`Module created: ${module.id} for course ${courseId}`);

      return module;
    } catch (error) {
      this.logger.error('Error creating module', error);
      throw error;
    }
  }

  /**
   * Listar todos os módulos de um curso
   */
  async findAll(courseId: string): Promise<Module[]> {
    // Verificar se o curso existe
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    return this.prisma.module.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      include: {
        videos: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Buscar módulo por ID
   */
  async findOne(id: string): Promise<Module> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructorId: true,
          },
        },
        videos: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    });

    if (!module || module.deletedAt) {
      throw new NotFoundException('Módulo não encontrado');
    }

    return module;
  }

  /**
   * Atualizar módulo
   */
  async update(id: string, updateModuleDto: UpdateModuleDto): Promise<Module> {
    // Verificar se o módulo existe
    const existingModule = await this.findOne(id);

    try {
      // Se a ordem foi alterada, verificar se não conflita com outro módulo
      if (updateModuleDto.order !== undefined && updateModuleDto.order !== existingModule.order) {
        const conflictingModule = await this.prisma.module.findFirst({
          where: {
            courseId: existingModule.courseId,
            order: updateModuleDto.order,
            NOT: {
              id,
            },
          },
        });

        if (conflictingModule) {
          throw new BadRequestException('Já existe um módulo com esta ordem neste curso');
        }
      }

      const module = await this.prisma.module.update({
        where: { id },
        data: updateModuleDto,
        include: {
          videos: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log(`Module updated: ${module.id}`);

      return module;
    } catch (error) {
      this.logger.error(`Error updating module ${id}`, error);
      throw error;
    }
  }

  /**
   * Soft-delete do módulo. Vídeos filhos ficam intocados — podem ser
   * restaurados em bloco depois via endpoint de restore (não nesta
   * sprint). Registra no audit log.
   */
  async remove(id: string, actorId: string | null = null): Promise<void> {
    await this.findOne(id);

    try {
      await this.prisma.module.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Module soft-deleted: ${id}`);
      await this.audit.record({
        actorId,
        action: AUDIT_ACTIONS.MODULE_SOFT_DELETE,
        entityType: 'modules',
        entityId: id,
      });
    } catch (error) {
      this.logger.error(`Error soft-deleting module ${id}`, error);
      throw new BadRequestException('Erro ao deletar módulo');
    }
  }

  /**
   * Reordenar módulos de um curso
   */
  async reorder(courseId: string, reorderDto: ReorderModulesDto): Promise<Module[]> {
    this.logger.log(`[REORDER] Iniciando reordenação para curso: ${courseId}`);
    this.logger.log(`[REORDER] Payload recebido: ${JSON.stringify(reorderDto)}`);
    
    // Verificar se o curso existe
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      this.logger.error(`[REORDER] Curso não encontrado: ${courseId}`);
      throw new NotFoundException('Curso não encontrado');
    }

    this.logger.log(`[REORDER] Curso encontrado: ${course.title}`);

    try {
      this.logger.log(`[REORDER] Atualizando ${reorderDto.modules.length} módulos...`);
      
      // SOLUÇÃO: Primeiro, atribuir valores temporários negativos para evitar conflito de constraint
      // Isso permite que todos os módulos fiquem com valores únicos temporariamente
      this.logger.log(`[REORDER] Passo 1: Atribuindo valores temporários...`);
      for (let i = 0; i < reorderDto.modules.length; i++) {
        const item = reorderDto.modules[i];
        await this.prisma.module.update({
          where: { id: item.id },
          data: { order: -(i + 1) }, // Valores negativos temporários: -1, -2, -3, etc
        });
      }
      
      // Agora, atualizar para os valores finais
      this.logger.log(`[REORDER] Passo 2: Atribuindo valores finais...`);
      for (const item of reorderDto.modules) {
        this.logger.log(`[REORDER] Atualizando módulo ${item.id} para ordem ${item.order}`);
        await this.prisma.module.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }

      this.logger.log(`[REORDER] Módulos reordenados com sucesso para curso ${courseId}`);

      // Retornar os módulos atualizados
      return this.findAll(courseId);
    } catch (error) {
      this.logger.error(`[REORDER] ERRO ao reordenar módulos para curso ${courseId}:`, error);
      this.logger.error(`[REORDER] Stack trace:`, error.stack);
      throw new BadRequestException('Erro ao reordenar módulos');
    }
  }

  /**
   * Verificar se módulo pertence a um curso específico
   */
  async belongsToCourse(moduleId: string, courseId: string): Promise<boolean> {
    const module = await this.prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId,
      },
    });

    return !!module;
  }

  /**
   * Obter próximo número de ordem disponível para um curso
   */
  async getNextOrder(courseId: string): Promise<number> {
    const lastModule = await this.prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });

    return lastModule ? lastModule.order + 1 : 0;
  }

  /**
   * Upload de thumbnail para o módulo
   * @param moduleId - ID do módulo
   * @param file - Arquivo de imagem (Buffer)
   * @param originalName - Nome original do arquivo
   * @param contentType - Tipo MIME do arquivo
   * @param orientation - 'horizontal' ou 'vertical'
   */
  async uploadThumbnail(
    moduleId: string,
    file: Buffer,
    originalName: string,
    contentType: string,
    orientation: 'horizontal' | 'vertical' = 'horizontal',
  ): Promise<Module> {
    // Verificar se o módulo existe
    const existingModule = await this.findOne(moduleId);

    // Validar tipo de imagem
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    try {
      // Gerar chave única para o arquivo no R2
      const ext = originalName.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const key = `thumbnails/modules/${moduleId}/${timestamp}-${orientation}.${ext}`;

      // Upload para R2
      this.logger.log(`Uploading module thumbnail: ${key}`);
      const uploadResult = await this.cloudflareR2.uploadFile(file, key, contentType);

      // Atualizar o campo correto no banco
      const updateData: Record<string, string> = {};
      if (orientation === 'horizontal') {
        updateData.thumbnailHorizontal = uploadResult.url;
      } else {
        updateData.thumbnailVertical = uploadResult.url;
      }

      // Também atualizar o campo genérico 'thumbnail' se for horizontal
      if (orientation === 'horizontal') {
        updateData.thumbnail = uploadResult.url;
      }

      const updatedModule = await this.prisma.module.update({
        where: { id: moduleId },
        data: updateData,
        include: {
          videos: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log(`Module thumbnail uploaded successfully: ${moduleId} (${orientation})`);

      return updatedModule;
    } catch (error) {
      this.logger.error(`Error uploading thumbnail for module ${moduleId}`, error);
      throw new BadRequestException('Erro ao fazer upload da thumbnail');
    }
  }
}
