import { IsString, IsInt, Min, Max } from 'class-validator';

export class CheckAnswerDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  answer!: number;
}
