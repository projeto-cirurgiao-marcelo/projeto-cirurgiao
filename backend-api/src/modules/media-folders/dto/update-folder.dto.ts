import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  /**
   * Para mover pra raiz, use string vazia ou null. UUID = move pra dentro
   * de outra pasta. Backend valida que parentId != self e que destination
   * nao e descendente da pasta sendo movida.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  courseId?: string | null;
}
