import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Stark Industries', required: false })
  @IsString()
  @IsOptional()
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
}
