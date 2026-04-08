import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, IsEnum, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

// Enum local até rodar a migration do Prisma
export enum VideoUploadStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR',
}

// Enum para fonte do vídeo
export enum VideoSource {
  CLOUDFLARE = 'cloudflare',
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  EXTERNAL = 'external',
  R2_HLS = 'r2_hls',
}

export class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  cloudflareId?: string;

  @IsString()
  @IsOptional()
  cloudflareUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  order: number;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsEnum(VideoUploadStatus)
  @IsOptional()
  uploadStatus?: VideoUploadStatus;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  uploadProgress?: number;

  @IsString()
  @IsOptional()
  uploadError?: string;

  @IsString()
  @IsOptional()
  tempFilePath?: string;

  @IsString()
  @IsOptional()
  externalUrl?: string;

  @IsString()
  @IsOptional()
  hlsUrl?: string;

  @IsEnum(VideoSource)
  @IsOptional()
  videoSource?: VideoSource;
}
