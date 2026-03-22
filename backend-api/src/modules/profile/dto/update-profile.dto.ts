import { IsString, IsOptional, IsArray, IsBoolean, MinLength } from 'class-validator';

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

export class UpdateFullProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  profession?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializations?: string[];

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres' })
  newPassword: string;
}
