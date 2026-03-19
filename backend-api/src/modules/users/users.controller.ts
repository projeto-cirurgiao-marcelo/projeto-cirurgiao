import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('students/overview')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Overview completo de alunos para o painel administrativo' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por nome ou email' })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'active', 'inactive'] })
  @ApiQuery({ name: 'sort', required: false, enum: ['recent', 'name', 'progress'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Overview de alunos retornado com sucesso' })
  getStudentsOverview(
    @Query('search') search?: string,
    @Query('status') status?: 'all' | 'active' | 'inactive',
    @Query('sort') sort?: 'recent' | 'name' | 'progress',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findStudentsOverview({
      search,
      status,
      sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('students/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detalhes completos de um aluno com matriculas, progresso e atividade' })
  @ApiResponse({ status: 200, description: 'Detalhes do aluno retornados com sucesso' })
  @ApiResponse({ status: 404, description: 'Aluno nao encontrado' })
  getStudentDetail(@Param('id') id: string) {
    return this.usersService.findStudentDetail(id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
