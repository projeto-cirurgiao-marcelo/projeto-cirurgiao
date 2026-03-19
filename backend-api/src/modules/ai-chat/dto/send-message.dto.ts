import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsUUID()
  videoId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;
}

export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  videoId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class MessageFeedbackDto {
  @IsString()
  feedback: 'helpful' | 'not_helpful';
}