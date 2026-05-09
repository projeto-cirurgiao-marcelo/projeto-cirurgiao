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
   * Valida regras de hierarquia: parent existe, pertence ao mesmo course,
   * NAO tem parentModuleId proprio (limita arvore a 1 nivel), e nao e o
   * mesmo que o filho (loop). Retorna o parent validado.
   */
  private async validateParentForChild(
    parentModuleId: string,
    expectedCourseId: string,
    childModuleId?: string,
  ): Promise<{ id: string; courseId: string }> {
    if (childModuleId && parentModuleId === childModuleId) {
      throw new BadRequestException(
        'Modulo nao pode ser pai de si mesmo',
      );
    }
    const parent = await this.prisma.module.findUnique({
      where: { id: parentModuleId },
      select: {
        id: true,
        courseId: true,
        parentModuleId: true,
        deletedAt: true,
      },
    });
    if (!parent || parent.deletedAt) {
      throw new NotFoundException('Modulo pai nao encontrado');
    }
    if (parent.courseId !== expectedCourseId) {
      throw new BadRequestException(
        'Modulo pai pertence a outro curso',
      );
    }
    if (parent.parentModuleId) {
      throw new BadRequestException(
        'Hierarquia limitada a 1 nivel — modulo pai ja e submodulo',
      );
    }
    return { id: parent.id, courseId: parent.courseId };
  }

  /**
   * Proximo `order` disponivel no escopo (parentModuleId || courseId raiz).
   * Reflete o partial unique scoped: modulos raiz sao unicos por courseId,
   * submodulos sao unicos por parentModuleId.
   */
  private async getNextOrderInScope(
    courseId: string,
    parentModuleId: string | null,
  ): Promise<number> {
    const last = await this.prisma.module.findFirst({
      where: parentModuleId
        ? { parentModuleId, deletedAt: null }
        : { courseId, parentModuleId: null, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

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

      // Resolve parentModuleId (null = modulo raiz, UUID = submodulo).
      const parentModuleId = createModuleDto.parentModuleId || null;
      if (parentModuleId) {
        await this.validateParentForChild(parentModuleId, courseId);
      }

      // Conflito de order respeita o scope (raiz vs filho de pai X).
      const conflictWhere = parentModuleId
        ? { parentModuleId, order: createModuleDto.order, deletedAt: null }
        : {
            courseId,
            parentModuleId: null,
            order: createModuleDto.order,
            deletedAt: null,
          };
      const existingModule = await this.prisma.module.findFirst({
        where: conflictWhere,
      });

      if (existingModule) {
        throw new BadRequestException(
          parentModuleId
            ? 'Já existe um submódulo com esta ordem dentro do pai'
            : 'Já existe um módulo com esta ordem neste curso',
        );
      }

      const module = await this.prisma.module.create({
        data: {
          ...createModuleDto,
          parentModuleId,
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

    // Carrega flat (todos os modulos do curso ativos). Frontend monta a
    // arvore hierarquica filtrando por parentModuleId. Mais simples que
    // recursive include e funciona ate ~1000 modulos sem stress.
    return this.prisma.module.findMany({
      where: {
        courseId,
        deletedAt: null,
      },
      include: {
        videos: {
          where: { deletedAt: null },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            videos: { where: { deletedAt: null } },
            childModules: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [
        { parentModuleId: 'asc' }, // raizes (null) primeiro, depois grupos de filhos
        { order: 'asc' },
      ],
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
          where: { deletedAt: null },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            videos: { where: { deletedAt: null } },
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
      // Detecta mudanca de parentModuleId. undefined = nao toca; null/'' =
      // promove pra raiz; UUID = move pra dentro de outro pai.
      let nextParentModuleId: string | null | undefined = undefined;
      if ('parentModuleId' in updateModuleDto) {
        const raw = updateModuleDto.parentModuleId;
        nextParentModuleId = raw === null || raw === undefined || raw === ''
          ? null
          : raw;
      }

      const willChangeParent =
        nextParentModuleId !== undefined &&
        nextParentModuleId !== existingModule.parentModuleId;

      if (willChangeParent && nextParentModuleId) {
        // Mover pra dentro de outro modulo: valida 1-nivel + nao-loop +
        // mesmo curso.
        await this.validateParentForChild(
          nextParentModuleId,
          existingModule.courseId,
          id,
        );
        // Se este modulo ja tem filhos proprios (e submodulo), promove-lo
        // a filho de outro pai criaria 2 niveis. Bloqueia.
        const hasChildren = await this.prisma.module.count({
          where: { parentModuleId: id, deletedAt: null },
        });
        if (hasChildren > 0) {
          throw new BadRequestException(
            'Modulo com submodulos nao pode virar submodulo (limite de 1 nivel)',
          );
        }
      }

      // Resolve novo order: muda quando parent muda (vai pro fim do novo
      // scope) OU quando admin envia order explicito. Conflito respeita
      // partial unique scoped (raiz vs filho).
      const finalParentForOrder =
        nextParentModuleId !== undefined
          ? nextParentModuleId
          : existingModule.parentModuleId;

      let finalOrder = updateModuleDto.order;
      if (willChangeParent && finalOrder === undefined) {
        finalOrder = await this.getNextOrderInScope(
          existingModule.courseId,
          finalParentForOrder,
        );
      }

      if (finalOrder !== undefined) {
        const conflictWhere: any = finalParentForOrder
          ? {
              parentModuleId: finalParentForOrder,
              order: finalOrder,
              deletedAt: null,
              NOT: { id },
            }
          : {
              courseId: existingModule.courseId,
              parentModuleId: null,
              order: finalOrder,
              deletedAt: null,
              NOT: { id },
            };
        const conflictingModule = await this.prisma.module.findFirst({
          where: conflictWhere,
        });
        if (conflictingModule) {
          throw new BadRequestException(
            finalParentForOrder
              ? 'Ja existe submodulo com esta ordem dentro do pai'
              : 'Ja existe modulo com esta ordem neste curso',
          );
        }
      }

      const module = await this.prisma.module.update({
        where: { id },
        data: {
          ...updateModuleDto,
          ...(willChangeParent ? { parentModuleId: nextParentModuleId } : {}),
          ...(finalOrder !== undefined ? { order: finalOrder } : {}),
        },
        include: {
          videos: {
            where: { deletedAt: null },
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

    // Scope: null = reorder de modulos raiz; UUID = reorder de filhos
    // de um parent. Valida que TODOS os ids do payload pertencem ao mesmo
    // scope — impede mistura raiz+filho num unico reorder.
    const expectedParentId =
      reorderDto.parentModuleId === undefined || reorderDto.parentModuleId === ''
        ? null
        : reorderDto.parentModuleId;

    if (reorderDto.modules.length > 0) {
      const ids = reorderDto.modules.map((m) => m.id);
      const found = await this.prisma.module.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: { id: true, courseId: true, parentModuleId: true },
      });
      if (found.length !== ids.length) {
        throw new BadRequestException('Um ou mais modulos nao encontrados');
      }
      const wrongCourse = found.find((m) => m.courseId !== courseId);
      if (wrongCourse) {
        throw new BadRequestException(
          `Modulo ${wrongCourse.id} nao pertence ao curso ${courseId}`,
        );
      }
      const wrongScope = found.find(
        (m) => (m.parentModuleId ?? null) !== expectedParentId,
      );
      if (wrongScope) {
        throw new BadRequestException(
          'Reorder mistura modulos de scopes diferentes (raiz vs submodulo). Envie listas separadas.',
        );
      }
    }

    try {
      this.logger.log(`[REORDER] Atualizando ${reorderDto.modules.length} módulos...`);

      // Atomicidade: envolve as 2 fases numa unica transacao Prisma.
      // Sem isso, falha no meio do passo 1 deixa modules com order
      // negativo persistido — proximas tentativas batem em P2002.
      // Offset gigante (-1_000_000_000) evita colidir com qualquer
      // residual ou com o partial unique index pos-soft-delete.
      const TEMP_OFFSET = -1_000_000_000;
      await this.prisma.$transaction(async (tx) => {
        this.logger.log(`[REORDER] Passo 1: Atribuindo valores temporários...`);
        for (let i = 0; i < reorderDto.modules.length; i++) {
          const item = reorderDto.modules[i];
          await tx.module.update({
            where: { id: item.id },
            data: { order: TEMP_OFFSET - (i + 1) },
          });
        }

        this.logger.log(`[REORDER] Passo 2: Atribuindo valores finais...`);
        for (const item of reorderDto.modules) {
          await tx.module.update({
            where: { id: item.id },
            data: { order: item.order },
          });
        }
      });

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
            where: { deletedAt: null },
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
