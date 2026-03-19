import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNotEmpty } from 'class-validator';
import { FirebaseAuthGuard } from '../firebase/guards/firebase-auth.guard';
import { VertexAiService } from './vertex-ai.service';
import { AiThumbnailService } from './ai-thumbnail.service';
import { UploadService } from '../upload/upload.service';

class ImproveTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsIn(['title', 'description'])
  type: 'title' | 'description';

  @IsString()
  @IsOptional()
  context?: string;
}

class GenerateDescriptionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  context?: string;
}

class GenerateThumbnailDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  overlayText?: string;

  @IsString()
  @IsIn(['medical', 'surgical', 'anatomy', 'clinical'])
  @IsOptional()
  style?: 'medical' | 'surgical' | 'anatomy' | 'clinical';
}

@ApiTags('AI Text Assist')
@Controller('ai')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class AiTextAssistController {
  constructor(
    private readonly vertexAiService: VertexAiService,
    private readonly aiThumbnailService: AiThumbnailService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('improve-text')
  async improveText(@Body() dto: ImproveTextDto) {
    const improved = await this.vertexAiService.improveText(
      dto.text.trim(),
      dto.type,
      dto.context,
    );

    return { original: dto.text, improved };
  }

  @Post('generate-description')
  async generateDescription(@Body() dto: GenerateDescriptionDto) {
    const description = await this.vertexAiService.generateDescription(
      dto.title.trim(),
      dto.context,
    );

    return { title: dto.title, description };
  }

  @Post('generate-thumbnail')
  async generateThumbnail(@Body() dto: GenerateThumbnailDto) {
    // 1. Gerar imagem com IA
    const result = await this.aiThumbnailService.generateThumbnail({
      title: dto.title,
      overlayText: dto.overlayText,
      style: dto.style || 'medical',
    });

    // 2. Determinar extensão pelo mimeType
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const ext = extMap[result.mimeType] || 'png';

    // 3. Upload para R2
    const url = await this.uploadService.uploadBufferToR2(
      result.buffer,
      result.mimeType,
      ext,
      'thumbnails/ai-generated',
    );

    return { url, title: dto.title };
  }
}
