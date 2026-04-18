import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ModulesService } from './modules.service';
import { CoursesService } from '../courses/courses.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
@UseGuards(FirebaseAuthGuard)
export class ModulesController {
  constructor(
    private readonly modulesService: ModulesService,
    private readonly coursesService: CoursesService,
  ) {}

  /**
   * Criar novo módulo em um curso (apenas instrutor do curso ou ADMIN)
   */
  @Post('courses/:courseId/modules')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async create(
    @Param('courseId') courseId: string,
    @Body() createModuleDto: CreateModuleDto,
    @Request() req,
  ) {
    // Verificar se o usuário é o instrutor do curso ou ADMIN
    if (req.user.role !== Role.ADMIN) {
      const isInstructor = await this.coursesService.isInstructor(courseId, req.user.sub);
      if (!isInstructor) {
        throw new ForbiddenException('Você não tem permissão para adicionar módulos a este curso');
      }
    }

    return this.modulesService.create(courseId, createModuleDto);
  }

  /**
   * Listar todos os módulos de um curso
   */
  @Get('courses/:courseId/modules')
  findAll(@Param('courseId') courseId: string) {
    return this.modulesService.findAll(courseId);
  }

  /**
   * Obter próximo número de ordem disponível
   */
  @Get('courses/:courseId/modules/next-order')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async getNextOrder(@Param('courseId') courseId: string, @Request() req) {
    // Verificar se o usuário é o instrutor do curso ou ADMIN
    if (req.user.role !== Role.ADMIN) {
      const isInstructor = await this.coursesService.isInstructor(courseId, req.user.sub);
      if (!isInstructor) {
        throw new ForbiddenException('Você não tem permissão para acessar este recurso');
      }
    }

    const nextOrder = await this.modulesService.getNextOrder(courseId);
    return { nextOrder };
  }

  /**
   * Reordenar módulos de um curso
   */
  @Patch('courses/:courseId/modules/reorder')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async reorder(
    @Param('courseId') courseId: string,
    @Body() reorderDto: ReorderModulesDto,
    @Request() req,
  ) {
    // Verificar se o usuário é o instrutor do curso ou ADMIN
    if (req.user.role !== Role.ADMIN) {
      const isInstructor = await this.coursesService.isInstructor(courseId, req.user.sub);
      if (!isInstructor) {
        throw new ForbiddenException('Você não tem permissão para reordenar módulos deste curso');
      }
    }

    return this.modulesService.reorder(courseId, reorderDto);
  }

  /**
   * Buscar módulo por ID
   */
  @Get('modules/:id')
  findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
  }

  /**
   * Atualizar módulo (apenas instrutor do curso ou ADMIN)
   */
  @Patch('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @Request() req,
  ) {
    // Buscar o módulo para obter o courseId
    const module = await this.modulesService.findOne(id);

    // Verificar se o usuário é o instrutor do curso ou ADMIN
    if (req.user.role !== Role.ADMIN) {
      const isInstructor = await this.coursesService.isInstructor(
        module.courseId,
        req.user.sub,
      );
      if (!isInstructor) {
        throw new ForbiddenException('Você não tem permissão para editar este módulo');
      }
    }

    return this.modulesService.update(id, updateModuleDto);
  }

  /**
   * Deletar módulo (apenas instrutor do curso ou ADMIN)
   */
  @Delete('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async remove(@Param('id') id: string, @Request() req) {
    // Buscar o módulo para obter o courseId
    const module = await this.modulesService.findOne(id);

    // Verificar se o usuário é o instrutor do curso ou ADMIN
    if (req.user.role !== Role.ADMIN) {
      const isInstructor = await this.coursesService.isInstructor(
        module.courseId,
        req.user.sub,
      );
      if (!isInstructor) {
        throw new ForbiddenException('Você não tem permissão para deletar este módulo');
      }
    }

    await this.modulesService.remove(id, req.user?.sub ?? req.user?.userId ?? null);
    return { message: 'Módulo deletado com sucesso' };
  }

  /**
   * Upload de thumbnail do módulo
   * POST /modules/:id/thumbnail?orientation=horizontal|vertical
   * Body: multipart/form-data com campo 'file' (imagem jpeg/png/webp)
   */
  @Post('modules/:id/thumbnail')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  async uploadThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('orientation') orientation: 'horizontal' | 'vertical' = 'horizontal',
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem é obrigatório');
    }

    // Buscar o módulo para obter o courseId
    const module = await this.modulesService.findOne(id);

    // Verificar se o usuário é o instrutor do curso ou ADMIN
    if (req.user.role !== Role.ADMIN) {
      const isInstructor = await this.coursesService.isInstructor(
        module.courseId,
        req.user.sub,
      );
      if (!isInstructor) {
        throw new ForbiddenException('Você não tem permissão para alterar a thumbnail deste módulo');
      }
    }

    return this.modulesService.uploadThumbnail(
      id,
      file.buffer,
      file.originalname,
      file.mimetype,
      orientation,
    );
  }
}
