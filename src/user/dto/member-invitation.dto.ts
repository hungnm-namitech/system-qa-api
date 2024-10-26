import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class MemberInvitationDto {
  @ApiProperty({ example: 'tony@stark-industries.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}