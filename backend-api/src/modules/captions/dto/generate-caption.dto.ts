import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Idiomas suportados para geração automática de legendas
export const SUPPORTED_CAPTION_LANGUAGES = [
  'pt', // Português
  'en', // Inglês
  'es', // Espanhol
  'fr', // Francês
  'de', // Alemão
  'it', // Italiano
  'ja', // Japonês
  'ko', // Coreano
  'pl', // Polonês
  'ru', // Russo
  'nl', // Holandês
  'cs', // Tcheco
] as const;

export type SupportedCaptionLanguage = typeof SUPPORTED_CAPTION_LANGUAGES[number];

export class GenerateCaptionDto {
  @ApiPropertyOptional({
    description: 'Código do idioma (BCP 47). Padrão: pt (Português)',
    example: 'pt',
    enum: SUPPORTED_CAPTION_LANGUAGES,
    default: 'pt',
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CAPTION_LANGUAGES, {
    message: `Idioma não suportado. Idiomas disponíveis: ${SUPPORTED_CAPTION_LANGUAGES.join(', ')}`,
  })
  language?: SupportedCaptionLanguage;
}

export class CaptionResponseDto {
  @ApiProperty({ description: 'Código do idioma', example: 'pt' })
  language: string;

  @ApiProperty({ description: 'Label do idioma para exibição', example: 'Português (auto-generated)' })
  label: string;

  @ApiProperty({ description: 'Se foi gerado automaticamente via IA', example: true })
  generated: boolean;

  @ApiProperty({ 
    description: 'Status da legenda', 
    example: 'ready',
    enum: ['inprogress', 'ready', 'error'],
  })
  status: 'inprogress' | 'ready' | 'error';
}

export class CaptionListResponseDto {
  @ApiProperty({ type: [CaptionResponseDto] })
  captions: CaptionResponseDto[];
}