import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSummaryDto {
  @ApiPropertyOptional({
    description: 'Instruções adicionais para personalizar o resumo',
    example: 'Foque mais nos aspectos práticos da cirurgia',
  })
  @IsOptional()
  @IsString()
  additionalInstructions?: string;
}