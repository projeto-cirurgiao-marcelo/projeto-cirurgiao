import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @IsString()
  questionId: string;

  @IsInt()
  answer: number; // Índice da resposta escolhida (0-3)

  @IsOptional()
  @IsInt()
  timeSpent?: number; // Tempo gasto nesta questão em segundos
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