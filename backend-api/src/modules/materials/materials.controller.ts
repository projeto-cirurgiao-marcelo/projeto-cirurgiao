import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Materials')
@Controller('videos/:videoId/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo material para um vídeo' })
  @ApiResponse({ status: 201, description: 'Material criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Vídeo não encontrado' })
  create(
    @Param('videoId') videoId: string,
    @Body() createMaterialDto: CreateMaterialDto,
  ) {
    return this.materialsService.create(videoId, createMaterialDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os materiais de um vídeo' })
  @ApiResponse({ status: 200, description: 'Lista de materiais' })
  findAll(@Param('videoId') videoId: string) {
    return this.materialsService.findAllByVideo(videoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar material por ID' })
  @ApiResponse({ status: 200, description: 'Material encontrado' })
  @ApiResponse({ status: 404, description: 'Material não encontrado' })
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar material' })
  @ApiResponse({ status: 200, description: 'Material atualizado' })
  @ApiResponse({ status: 404, description: 'Material não encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(id, updateMaterialDto);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover material' })
  @ApiResponse({ status: 204, description: 'Material removido' })
  @ApiResponse({ status: 404, description: 'Material não encontrado' })
  remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }

  @Post('reorder')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordenar materiais' })
  @ApiResponse({ status: 200, description: 'Materiais reordenados' })
  reorder(
    @Param('videoId') videoId: string,
    @Body() body: { materialIds: string[] },
  ) {
    return this.materialsService.reorder(videoId, body.materialIds);
  }
}
