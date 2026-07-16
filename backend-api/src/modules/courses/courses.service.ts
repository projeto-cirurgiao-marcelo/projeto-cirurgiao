import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ReorderCoursesDto } from './dto/reorder-courses.dto';
import { Course } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareR2: CloudflareR2Service,
    private audit: AuditService,
  ) {}

  /**
   * Criar um novo curso
   */
  async create(instructorId: string, createCourseDto: CreateCourseDto): Promise<Course> {
    try {
      // Gerar slug a partir do título
      const slug = this.generateSlug(createCourseDto.title);

      // Verificar se o slug já existe
      const existingCourse = await this.prisma.course.findUnique({
        where: { slug },
      });

      if (existingCourse) {
        throw new BadRequestException('Um curso com este título já existe');
      }

      // Curso novo entra no fim da lista (max+1). Admin reordena via
      // drag-drop em /admin/courses depois.
      const last = await this.prisma.course.findFirst({
        where: { deletedAt: null },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const nextPosition = (last?.position ?? 0) + 1;

      const course = await this.prisma.course.create({
        data: {
          title: createCourseDto.title,
          description: createCourseDto.description,
          thumbnail: createCourseDto.thumbnailHorizontal ?? createCourseDto.thumbnail,
          thumbnailHorizontal: createCourseDto.thumbnailHorizontal,
          thumbnailVertical: createCourseDto.thumbnailVertical,
          price: createCourseDto.price,
          isPublished: createCourseDto.isPublished,
          slug,
          position: nextPosition,
          instructor: {
            connect: { id: instructorId },
          },
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          modules: {
            where: { deletedAt: null },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log(`Course created: ${course.id}`);

      return course;
    } catch (error) {
      this.logger.error('Error creating course', error);
      throw error;
    }
  }

  /**
   * Busca de catálogo pro aluno (topbar "Buscar cursos, aulas...").
   * ILIKE em título/descrição de curso e título de aula; só conteúdo
   * publicado e não deletado.
   * ponytail: contains/insensitive resolve pro catálogo atual; se crescer
   * pra dezenas de milhares de aulas, trocar por full-text/pg_trgm.
   */
  async searchCatalog(query: string) {
    const q = (query ?? '').trim();
    if (q.length < 2) {
      return { courses: [], videos: [] };
    }

    // Aulas que MENCIONAM o termo no conteúdo falado (transcrição Whisper).
    // Aluno raramente sabe o título exato da aula ("TPLO" não está no título,
    // mas está na transcrição). ILIKE seq-scan é ok no volume atual
    // (pg_trgm index se crescer).
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const transcriptRows = await this.prisma.$queryRaw<{ videoId: string }[]>`
      SELECT DISTINCT "videoId" FROM transcript_embeddings
      WHERE "chunkText" ILIKE ${pattern}
      LIMIT 50
    `;
    const transcriptVideoIds = transcriptRows.map((r) => r.videoId);

    const [courses, videos] = await Promise.all([
      this.prisma.course.findMany({
        where: {
          deletedAt: null,
          isPublished: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          thumbnailHorizontal: true,
          thumbnailVertical: true,
          instructor: { select: { name: true } },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      this.prisma.video.findMany({
        where: {
          deletedAt: null,
          isPublished: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            ...(transcriptVideoIds.length > 0
              ? [{ id: { in: transcriptVideoIds } }]
              : []),
          ],
          module: {
            deletedAt: null,
            course: { deletedAt: null, isPublished: true },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          module: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { title: 'asc' },
        take: 30,
      }),
    ]);

    // Contagem de aulas publicadas por curso (pro card de resultado)
    const lessonCounts = new Map<string, number>();
    if (courses.length > 0) {
      const modules = await this.prisma.module.findMany({
        where: { deletedAt: null, courseId: { in: courses.map((c) => c.id) } },
        select: {
          courseId: true,
          _count: {
            select: { videos: { where: { deletedAt: null, isPublished: true } } },
          },
        },
      });
      for (const m of modules) {
        lessonCounts.set(m.courseId, (lessonCounts.get(m.courseId) ?? 0) + m._count.videos);
      }
    }

    return {
      courses: courses.map((c) => ({
        ...c,
        lessonsCount: lessonCounts.get(c.id) ?? 0,
      })),
      videos: videos
        .map((v) => {
          const ql = q.toLowerCase();
          const matchedIn =
            v.title.toLowerCase().includes(ql) ||
            (v.description ?? '').toLowerCase().includes(ql)
              ? ('title' as const)
              : ('content' as const);
          return {
            id: v.id,
            title: v.title,
            duration: v.duration,
            moduleTitle: v.module.title,
            courseId: v.module.course.id,
            courseTitle: v.module.course.title,
            matchedIn,
          };
        })
        // Matches de título primeiro; menções na transcrição depois
        .sort((a, b) =>
          a.matchedIn === b.matchedIn ? 0 : a.matchedIn === 'title' ? -1 : 1,
        ),
    };
  }

  /**
   * Listar todos os cursos
   */
  async findAll(includeUnpublished = false): Promise<Course[]> {
    // Hide soft-deleted rows from every listing — admin panel can pass
    // its own where clause if it ever needs to browse the recycle bin.
    const where: any = { deletedAt: null };
    if (!includeUnpublished) where.isPublished = true;

    return this.prisma.course.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        modules: {
          where: { deletedAt: null },
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
              where: { deletedAt: null },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: { where: { deletedAt: null } },
          },
        },
      },
      // position ASC = ordem manual definida via /admin/courses drag-drop;
      // empate cai no createdAt DESC (cursos novos primeiro entre os de
      // mesma position). Indexado em (position, createdAt).
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Listar cursos de um instrutor específico
   */
  async findByInstructor(instructorId: string): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: {
        instructorId,
        deletedAt: null,
      },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
              where: { deletedAt: null },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Buscar curso por ID
   */
  async findOne(id: string): Promise<Course> {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        modules: {
          where: { deletedAt: null },
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
              where: { deletedAt: null },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course || course.deletedAt) {
      // Soft-deleted courses surface as NotFound to keep the public API
      // honest. AdminPanel listing + restore endpoint would bypass this.
      throw new NotFoundException('Curso não encontrado');
    }

    return course;
  }

  /**
   * Buscar curso por slug
   */
  async findBySlug(slug: string): Promise<Course> {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        modules: {
          where: { deletedAt: null },
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
              where: { deletedAt: null },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Curso não encontrado');
    }

    return course;
  }

  /**
   * Atualizar curso
   */
  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    // Verificar se o curso existe
    await this.findOne(id);

    try {
      // Se o título foi alterado, gerar novo slug
      let slug: string | undefined;
      if (updateCourseDto.title) {
        slug = this.generateSlug(updateCourseDto.title);

        // Verificar se o novo slug já existe (exceto para o curso atual)
        const existingCourse = await this.prisma.course.findFirst({
          where: {
            slug,
            NOT: {
              id,
            },
          },
        });

        if (existingCourse) {
          throw new BadRequestException('Um curso com este título já existe');
        }
      }

      const course = await this.prisma.course.update({
        where: { id },
        data: {
          ...updateCourseDto,
          ...(slug && { slug }),
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          modules: {
            where: { deletedAt: null },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log(`Course updated: ${course.id}`);

      return course;
    } catch (error) {
      this.logger.error(`Error updating course ${id}`, error);
      throw error;
    }
  }

  /**
   * Soft-delete do curso.
   *
   * Antes era `prisma.course.delete({ where: { id } })` — agora apenas
   * marca `deletedAt = now()` e registra no audit log. Progressões,
   * matrículas e forum topics dos alunos ficam intocados, o que mantém
   * analytics históricos honestos. Um endpoint de restore futuro só
   * precisa zerar `deletedAt`.
   */
  async remove(id: string, actorId: string | null = null): Promise<void> {
    // Garante que o curso existe E não está soft-deleted já.
    await this.findOne(id);

    try {
      await this.prisma.course.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Course soft-deleted: ${id}`);
      await this.audit.record({
        actorId,
        action: AUDIT_ACTIONS.COURSE_SOFT_DELETE,
        entityType: 'courses',
        entityId: id,
      });
    } catch (error) {
      this.logger.error(`Error soft-deleting course ${id}`, error);
      throw new BadRequestException('Erro ao deletar curso');
    }
  }

  /**
   * Reordenar cursos via drag-drop em /admin/courses.
   *
   * Pattern igual ao ModulesService.reorder: $transaction + offset gigante
   * pra evitar colisao com Course unique key se acontecer no futuro
   * (atualmente Course nao tem unique constraint em (instructorId, position)
   * mas defensive coding mantem o pattern caso seja adicionado).
   */
  async reorder(reorderDto: ReorderCoursesDto): Promise<Course[]> {
    this.logger.log(`[REORDER] Reordenando ${reorderDto.courses.length} cursos`);

    try {
      const TEMP_OFFSET = -1_000_000_000;
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < reorderDto.courses.length; i++) {
          const item = reorderDto.courses[i];
          await tx.course.update({
            where: { id: item.id },
            data: { position: TEMP_OFFSET - (i + 1) },
          });
        }
        for (const item of reorderDto.courses) {
          await tx.course.update({
            where: { id: item.id },
            data: { position: item.position },
          });
        }
      });

      this.logger.log(`[REORDER] Cursos reordenados com sucesso`);

      return this.prisma.course.findMany({
        where: { deletedAt: null },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      this.logger.error(`[REORDER] Erro ao reordenar cursos:`, error);
      throw new BadRequestException('Erro ao reordenar cursos');
    }
  }

  /**
   * Publicar/despublicar curso
   */
  async togglePublish(id: string): Promise<Course> {
    const course = await this.findOne(id);

    return this.prisma.course.update({
      where: { id },
      data: {
        isPublished: !course.isPublished,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        modules: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  /**
   * Gerar slug a partir do título
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  }

  /**
   * Verificar se usuário é instrutor do curso
   */
  async isInstructor(courseId: string, userId: string): Promise<boolean> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instructorId: userId,
      },
    });

    return !!course;
  }

  /**
   * Upload de thumbnail para o curso
   * @param courseId - ID do curso
   * @param file - Arquivo de imagem (Buffer)
   * @param originalName - Nome original do arquivo
   * @param contentType - Tipo MIME do arquivo
   * @param orientation - 'horizontal' ou 'vertical'
   */
  async uploadThumbnail(
    courseId: string,
    file: Buffer,
    originalName: string,
    contentType: string,
    orientation: 'horizontal' | 'vertical' = 'horizontal',
  ): Promise<Course> {
    // Verificar se o curso existe
    const course = await this.findOne(courseId);

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
      const key = `thumbnails/courses/${courseId}/${timestamp}-${orientation}.${ext}`;

      // Upload para R2
      this.logger.log(`Uploading course thumbnail: ${key}`);
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

      const updatedCourse = await this.prisma.course.update({
        where: { id: courseId },
        data: updateData,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          modules: {
            where: { deletedAt: null },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      this.logger.log(`Course thumbnail uploaded successfully: ${courseId} (${orientation})`);

      return updatedCourse;
    } catch (error) {
      this.logger.error(`Error uploading thumbnail for course ${courseId}`, error);
      throw new BadRequestException('Erro ao fazer upload da thumbnail');
    }
  }
}
