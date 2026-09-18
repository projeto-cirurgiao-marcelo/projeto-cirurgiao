import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AnimalSpecies,
  LifeSavedImpact,
  LifeSavedMediaKind,
  LifeSavedReportStatus,
} from '@prisma/client';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Tudo opcional no PATCH: o rascunho pode ser salvo aos poucos. Os três
 * obrigatórios (nome, CRMV, atribuição) são exigidos no submit, no service.
 * `attribution` não tem MaxLength de propósito (decisão de 10/09).
 */
export class UpdateReportDto {
  @IsOptional() @IsString() @Transform(trim) @MaxLength(160)
  reporterName?: string;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(20)
  reporterCrmv?: string;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(160)
  reporterTitle?: string;

  @IsOptional() @IsString() @Transform(trim)
  attribution?: string;

  @IsOptional() @IsEnum(AnimalSpecies)
  species?: AnimalSpecies;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(80)
  speciesOther?: string;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(80)
  animalName?: string;

  /** ISO date (YYYY-MM-DD). */
  @IsOptional() @IsDateString()
  occurredAt?: string;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(160)
  procedureSummary?: string;

  @IsOptional() @IsEnum(LifeSavedImpact)
  impactType?: LifeSavedImpact;

  @IsOptional() @IsUUID()
  relatedCourseId?: string;

  @IsOptional() @IsBoolean()
  consentPublicStory?: boolean;

  @IsOptional() @IsBoolean()
  consentShowName?: boolean;
}

/** Backfill histórico pelo admin: nasce APROVADO; CRMV pode faltar. */
export class AdminCreateReportDto extends UpdateReportDto {
  @IsString() @IsNotEmpty() @Transform(trim) @MaxLength(160)
  declare reporterName: string;

  @IsString() @IsNotEmpty() @Transform(trim)
  declare attribution: string;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(160)
  onBehalfOfName?: string;
}

export class MediaUploadUrlDto {
  @IsEnum(LifeSavedMediaKind)
  kind: LifeSavedMediaKind;

  @IsString() @MaxLength(100)
  mimeType: string;

  @IsInt() @Min(1)
  sizeBytes: number;

  @IsOptional() @IsString() @Transform(trim) @MaxLength(200)
  caption?: string;
}

export class RejectReportDto {
  @IsString() @IsNotEmpty() @Transform(trim) @MaxLength(1000)
  reason: string;
}

export class AdminListQueryDto {
  @IsOptional() @IsEnum(LifeSavedReportStatus)
  status?: LifeSavedReportStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number = 20;
}

export class StoriesQueryDto {
  @IsOptional() @IsUUID()
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 12;
}
