import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../shared/audit/audit.constants';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Overview completo de alunos para o painel administrativo
   * Inclui KPIs, lista paginada com engajamento, alunos recentes e top cursos
   */
  async findStudentsOverview(params: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    sort?: 'recent' | 'name' | 'progress';
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      status = 'all',
      sort = 'recent',
      page = 1,
      limit = 10,
    } = params;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ---- Filtro base ----
    const baseWhere: any = { role: Role.STUDENT };

    if (status === 'active') baseWhere.isActive = true;
    if (status === 'inactive') baseWhere.isActive = false;

    if (search) {
      baseWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ---- Ordenação ----
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'name') orderBy = { name: 'asc' };
    // sort === 'progress' será feito em memória após a query

    // ---- KPIs ----
    const [totalStudents, newStudents30d, allStudentsWithEnrollments] =
      await Promise.all([
        // Total de alunos
        this.prisma.user.count({ where: { role: Role.STUDENT } }),

        // Novos nos últimos 30 dias
        this.prisma.user.count({
          where: {
            role: Role.STUDENT,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),

        // Todos os alunos com enrollments para calcular métricas
        this.prisma.user.findMany({
          where: { role: Role.STUDENT },
          select: {
            id: true,
            enrollments: {
              select: {
                progress: true,
                lastAccessAt: true,
              },
            },
          },
        }),
      ]);

    // Calcular alunos ativos (com acesso nos últimos 30d)
    const activeStudents30d = allStudentsWithEnrollments.filter((s) =>
      s.enrollments.some(
        (e) => e.lastAccessAt && new Date(e.lastAccessAt) >= thirtyDaysAgo,
      ),
    ).length;

    // Calcular progresso médio global
    const studentsWithEnrollments = allStudentsWithEnrollments.filter(
      (s) => s.enrollments.length > 0,
    );
    let averageProgress = 0;
    if (studentsWithEnrollments.length > 0) {
      const totalProgress = studentsWithEnrollments.reduce((acc, s) => {
        const studentAvg =
          s.enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) /
          s.enrollments.length;
        return acc + studentAvg;
      }, 0);
      averageProgress = Math.round(totalProgress / studentsWithEnrollments.length);
    }

    // ---- Lista paginada de alunos ----
    const [students, totalFiltered] = await Promise.all([
      this.prisma.user.findMany({
        where: baseWhere,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { enrollments: true },
          },
          enrollments: {
            select: {
              progress: true,
              lastAccessAt: true,
              course: {
                select: { id: true, title: true },
              },
            },
            orderBy: { lastAccessAt: 'desc' },
          },
        },
        orderBy: sort !== 'progress' ? orderBy : { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where: baseWhere }),
    ]);

    // Mapear alunos com métricas calculadas
    let mappedStudents = students.map((student) => {
      const enrollments = student.enrollments || [];
      const avgProgress =
        enrollments.length > 0
          ? Math.round(
              enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) /
                enrollments.length,
            )
          : 0;

      const lastAccess = enrollments.reduce((latest: Date | null, e) => {
        if (!e.lastAccessAt) return latest;
        const d = new Date(e.lastAccessAt);
        return !latest || d > latest ? d : latest;
      }, null);

      return {
        id: student.id,
        email: student.email,
        name: student.name,
        role: student.role,
        isActive: student.isActive,
        createdAt: student.createdAt,
        enrollmentCount: student._count.enrollments,
        averageProgress: avgProgress,
        lastAccessAt: lastAccess,
        enrollments: enrollments.map((e) => ({
          courseId: e.course.id,
          courseTitle: e.course.title,
          progress: e.progress || 0,
          lastAccessAt: e.lastAccessAt,
        })),
      };
    });

    // Ordenar por progresso se solicitado
    if (sort === 'progress') {
      mappedStudents.sort((a, b) => b.averageProgress - a.averageProgress);
    }

    // ---- Alunos Recentes (top 5) ----
    const recentStudents = await this.prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // ---- Top Cursos por Matrículas ----
    const topCourses = await this.prisma.course.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: {
        enrollments: { _count: 'desc' },
      },
      take: 5,
    });

    return {
      stats: {
        totalStudents,
        activeStudents30d,
        averageProgress,
        newStudents30d,
      },
      students: mappedStudents,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit),
      },
      recentStudents,
      topCourses: topCourses.map((c) => ({
        courseId: c.id,
        title: c.title,
        enrollmentCount: c._count.enrollments,
      })),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Detalhes completos de um aluno com matrículas, progresso e atividade
   */
  async findStudentDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          select: {
            id: true,
            progress: true,
            lastAccessAt: true,
            enrolledAt: true,
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailHorizontal: true,
                thumbnail: true,
                isPublished: true,
                _count: {
                  select: { modules: true },
                },
                modules: {
                  select: {
                    _count: { select: { videos: true } },
                  },
                },
              },
            },
          },
          orderBy: { lastAccessAt: 'desc' },
        },
        quizAttempts: {
          select: {
            id: true,
            score: true,
            correctCount: true,
            totalQuestions: true,
            completedAt: true,
            quiz: {
              select: {
                title: true,
                video: {
                  select: {
                    title: true,
                    module: {
                      select: { title: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Aluno nao encontrado');
    }

    const enrollments = user.enrollments || [];
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) /
              enrollments.length,
          )
        : 0;

    const lastAccess = enrollments.reduce((latest: Date | null, e) => {
      if (!e.lastAccessAt) return latest;
      const d = new Date(e.lastAccessAt);
      return !latest || d > latest ? d : latest;
    }, null);

    // score já é uma porcentagem 0-100 (calculado em quiz-attempts.service como correctCount/totalQuestions*100)
    const quizAvgScore =
      user.quizAttempts.length > 0
        ? Math.round(
            user.quizAttempts.reduce(
              (sum, q) => sum + (q.score || 0),
              0,
            ) / user.quizAttempts.length,
          )
        : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      enrollmentCount: enrollments.length,
      averageProgress: avgProgress,
      lastAccessAt: lastAccess,
      quizAverageScore: quizAvgScore,
      totalQuizAttempts: user.quizAttempts.length,
      enrollments: enrollments.map((e) => {
        // Contar total de videos somando os videos de cada modulo
        const totalVideos = e.course.modules.reduce(
          (sum, m) => sum + m._count.videos,
          0,
        );
        return {
          id: e.id,
          courseId: e.course.id,
          courseTitle: e.course.title,
          courseDescription: e.course.description,
          courseThumbnail: e.course.thumbnailHorizontal || e.course.thumbnail,
          courseModules: e.course._count.modules,
          courseVideos: totalVideos,
          progress: e.progress || 0,
          lastAccessAt: e.lastAccessAt,
          enrolledAt: e.enrolledAt,
        };
      }),
      recentQuizzes: user.quizAttempts.map((q) => ({
        id: q.id,
        quizTitle: q.quiz.title,
        videoTitle: q.quiz.video?.title || null,
        moduleTitle: q.quiz.video?.module?.title || null,
        correctCount: q.correctCount || 0,
        totalQuestions: q.totalQuestions,
        percentage: q.score || 0, // score já é porcentagem 0-100
        attemptedAt: q.completedAt,
      })),
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email já está em uso');
      }
    }

    const data: any = { ...updateUserDto };

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, actorId: string | null = null) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || user.deletedAt) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Soft-delete: preserva histórico de matrículas, progresso e posts
    // de fórum. Email vira inativo mas a linha fica rastreável.
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.USER_SOFT_DELETE,
      entityType: 'users',
      entityId: id,
      metadata: { email: user.email, role: user.role },
    });

    return { message: 'Usuário removido com sucesso' };
  }
}
