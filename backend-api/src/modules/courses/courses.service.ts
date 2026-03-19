import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CloudflareR2Service } from '../cloudflare/cloudflare-r2.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareR2: CloudflareR2Service,
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

      const course = await this.prisma.course.create({
        data: {
          title: createCourseDto.title,
          description: createCourseDto.description,
          thumbnail: createCourseDto.thumbnail,
          price: createCourseDto.price,
          isPublished: createCourseDto.isPublished,
          slug,
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
   * Listar todos os cursos
   */
  async findAll(includeUnpublished = false): Promise<Course[]> {
    const where = includeUnpublished ? {} : { isPublished: true };

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
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Listar cursos de um instrutor específico
   */
  async findByInstructor(instructorId: string): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: {
        instructorId,
      },
      include: {
        modules: {
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
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

    if (!course) {
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
          orderBy: {
            order: 'asc',
          },
          include: {
            videos: {
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

    if (!course) {
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
   * Deletar curso
   */
  async remove(id: string): Promise<void> {
    // Verificar se o curso existe
    await this.findOne(id);

    try {
      await this.prisma.course.delete({
        where: { id },
      });

      this.logger.log(`Course deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting course ${id}`, error);
      throw new BadRequestException('Erro ao deletar curso');
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
