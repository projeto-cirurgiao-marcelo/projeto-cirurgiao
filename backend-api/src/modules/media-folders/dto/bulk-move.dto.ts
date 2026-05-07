import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class BulkMoveDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  videoIds: string[];

  /**
   * null/empty = mover pra "sem pasta" (unassigned).
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUUID()
  folderId?: string | null;
}
