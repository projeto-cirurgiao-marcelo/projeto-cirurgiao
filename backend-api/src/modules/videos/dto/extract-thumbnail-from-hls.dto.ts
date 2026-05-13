import { IsNumber, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class ExtractThumbnailFromHlsDto {
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7200)
  seekSec?: number;
}
