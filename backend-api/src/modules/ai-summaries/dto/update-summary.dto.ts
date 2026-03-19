import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSummaryDto {
  @ApiProperty({
    description: 'Conteúdo atualizado do resumo em Markdown',
    example: '# Resumo Atualizado\n\n## Tópicos\n- Tópico 1\n- Tópico 2',
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}