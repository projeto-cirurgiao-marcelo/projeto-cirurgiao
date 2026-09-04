import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string; // Deprecated - mantido para compatibilidade

  @IsString()
  @IsOptional()
  thumbnailVertical?: string; // Thumbnail vertical (9:16) - ideal para mobile

  @IsString()
  @IsOptional()
  thumbnailHorizontal?: string; // Thumbnail horizontal (16:9) - ideal para desktop

  /** Nome do(s) professor(es) exibido nos cards; vazio = nome da conta dona do curso. */
  @IsString()
  @MaxLength(120)
  @IsOptional()
  instructorName?: string;

  /** Cargo/especialidade exibido abaixo do nome. */
  @IsString()
  @MaxLength(120)
  @IsOptional()
  instructorTitle?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
