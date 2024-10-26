import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserEmailConfirmDto {
  @ApiProperty({ example: 'tony@stark-industries.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'arhpolbovqnijqcgfpswxrdgeqwqebkd' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
