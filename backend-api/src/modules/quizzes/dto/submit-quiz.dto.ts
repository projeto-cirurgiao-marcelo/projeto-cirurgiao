import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfidenceLevel } from '@prisma/client';

export class QuizAnswerDto {
  @IsString()
  questionId: string;

  @IsInt()
  answer: number; // Índice da resposta escolhida (0-3)

  @IsOptional()
  @IsInt()
  timeSpent?: number; // Tempo gasto nesta questão em segundos

  @IsOptional()
  @IsEnum(['GUESSED', 'THOUGHT_KNEW', 'KNEW', 'MASTERED'])
  confidence?: ConfidenceLevel; // Sprint 1: nível de confiança auto-reportado pelo aluno
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @IsOptional()
  @IsInt()
  totalTimeSpent?: number; // Tempo total gasto no quiz em segundos
}
