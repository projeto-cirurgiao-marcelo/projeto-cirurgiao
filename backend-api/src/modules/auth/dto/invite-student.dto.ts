import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteStudentDto {
  @ApiProperty({ example: 'aluno@example.com', description: 'E-mail do aluno' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'Maria Silva',
    description: 'Nome do aluno. Se omitido, é derivado do e-mail (o aluno ajusta no perfil).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Enviar o e-mail de criação de senha (template do Firebase). Padrão: true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class ResendInviteDto {
  @ApiPropertyOptional({
    description: 'Enviar o e-mail de criação de senha (template do Firebase). Padrão: true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
