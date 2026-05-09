import { IsArray, IsString, IsInt, IsOptional, IsUUID, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ModuleOrderItem {
  @IsString()
  id: string;

  @IsInt()
  order: number;
}

export class ReorderModulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleOrderItem)
  modules: ModuleOrderItem[];

  /**
   * Scope opcional. Quando definido, todos os modulos da lista devem
   * ser submodulos deste parent. Quando ausente/null, lista deve conter
   * apenas modulos raiz (parentModuleId IS NULL).
   * Backend valida consistencia em ModulesService.reorder.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  parentModuleId?: string | null;
}
