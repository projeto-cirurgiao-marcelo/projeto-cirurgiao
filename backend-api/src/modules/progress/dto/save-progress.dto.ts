import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class SaveProgressDto {
  @IsString()
  videoId: string;

  @IsNumber()
  @Min(0)
  watchTime: number; // tempo assistido em segundos

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  videoDuration?: number; // duração total do vídeo reportada pelo player
}

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  watchTime?: number;

  @IsBoolean()
  @IsOptional()
  watched?: boolean;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
