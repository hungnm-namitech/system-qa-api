import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OrganizationDto {
  @ApiProperty({ example: 'Stark Industries' })
  @Expose()
  name: string;
}
