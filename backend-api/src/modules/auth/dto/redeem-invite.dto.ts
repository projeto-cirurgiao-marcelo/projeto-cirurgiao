import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RedeemInviteDto {
  @ApiProperty({ description: 'Token de convite (JWT assinado pelo backend)' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Nova senha do aluno',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'A senha deve conter letra maiúscula, minúscula e número',
  })
  newPassword: string;
}
