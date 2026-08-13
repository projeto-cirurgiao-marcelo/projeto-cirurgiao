import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateShowcaseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;

  /** product.id do TheMembers. Vazio = vitrine sem produto vinculado ainda. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalProductId?: string;

  @IsOptional()
  @IsBoolean()
  grantsAllContent?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  previewSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateShowcaseDto extends CreateShowcaseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  declare title: string;
}

export class AddVideosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsUUID('4', { each: true })
  videoIds: string[];
}

export class AddModuleVideosDto {
  @IsUUID()
  moduleId: string;

  /** Submódulos são 1 nível só (regra do schema) — default inclui. */
  @IsOptional()
  @IsBoolean()
  includeSubmodules?: boolean;

  /** Aula não publicada normalmente não entra numa vitrine. */
  @IsOptional()
  @IsBoolean()
  includeUnpublished?: boolean;
}
