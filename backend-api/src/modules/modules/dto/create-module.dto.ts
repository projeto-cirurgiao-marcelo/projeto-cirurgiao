import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsUUID, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  thumbnailVertical?: string;

  @IsString()
  @IsOptional()
  thumbnailHorizontal?: string;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  order: number;

  /**
   * Modulo pai (submodulo). Null/undefined = modulo raiz do curso.
   * Hierarquia limitada a 1 nivel: parent nao pode ter parentModuleId.
   * Validado em service (BadRequestException se violar).
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  parentModuleId?: string | null;
}
