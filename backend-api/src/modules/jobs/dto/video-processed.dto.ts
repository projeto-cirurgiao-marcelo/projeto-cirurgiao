import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class VideoProcessedDto {
  @IsString()
  sourceKey!: string;

  @IsString()
  @IsOptional()
  destinationKey?: string;

  @IsString()
  @IsIn(['completed', 'failed', 'processing'])
  status!: 'completed' | 'failed' | 'processing';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  profiles?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  durationSec?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  filesUploaded?: number;

  @IsString()
  @IsOptional()
  error?: string;
}
