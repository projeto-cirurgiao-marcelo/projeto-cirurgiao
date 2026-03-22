import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';

export class CreateLibraryConversationDto {
  @IsString()
  @IsOptional()
  title?: string;
}

export class SendLibraryMessageDto {
  @IsString()
  message: string;
}

export class MessageFeedbackDto {
  @IsEnum(['helpful', 'not_helpful'])
  feedback: 'helpful' | 'not_helpful';
}

export class IngestDocumentDto {
  @IsString()
  title: string;

  @IsString()
  gcsPath: string;

  @IsString()
  @IsOptional()
  language?: string;
}
