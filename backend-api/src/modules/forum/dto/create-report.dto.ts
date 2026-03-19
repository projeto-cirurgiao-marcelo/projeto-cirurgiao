import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  OFFENSIVE = 'OFFENSIVE',
  OFF_TOPIC = 'OFF_TOPIC',
  OTHER = 'OTHER',
}

export class CreateReportDto {
  @IsUUID()
  topicId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @IsOptional()
  description?: string;
}
