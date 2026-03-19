import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateOnboardingDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializations?: string[];

  @IsString()
  @IsOptional()
  profession?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;
}

export class SkipOnboardingDto {
  @IsBoolean()
  skip: boolean;
}
