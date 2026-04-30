import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVideoDurationDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  duration: number;
}
