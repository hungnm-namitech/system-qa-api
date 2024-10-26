import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UserRegisterDto {
  @ApiProperty({ example: 'Stark Industries' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty({ example: 'Tony Stark' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: UserGender.MALE, required: false, enum: UserGender })
  @IsEnum(UserGender)
  @IsOptional()
  gender: UserGender;

  @ApiProperty({ example: '1990-12-31', required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  birthday: Date;

  @ApiProperty({ example: 'tony@stark-industries.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,16}$/, {
    message: `パスワードは8文字以上16文字以下で、少なくとも1つのアルファベットと1つの数字を含める必要があります。`,
  })
  password: string;
}
