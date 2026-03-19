import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { QuizDifficulty } from '@prisma/client';

export class GenerateQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(QuizDifficulty)
  difficulty?: QuizDifficulty;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(20)
  questionCount?: number; // Número de questões a gerar (5-20)

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  timeLimit?: number; // Tempo limite em segundos (1min - 1h)

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number; // Pontuação mínima para passar (0-100%)
}