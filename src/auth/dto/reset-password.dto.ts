import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'tony@stark-industries.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'arhpolbovqnijqcgfpswxrdgeqwqebkd' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,16}$/, {
    message: `パスワードは8文字以上16文字以下で、少なくとも1つのアルファベットと1つの数字を含める必要があります。`,
  })
  newPassword: string;
}
