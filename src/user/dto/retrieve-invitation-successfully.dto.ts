import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { OrganizationDto } from '@/organization/dto/organization.dto';

export class RetrieveInvitationSuccessfullyDto {
  @ApiProperty({ type: OrganizationDto })
  @Expose()
  @Type(() => OrganizationDto)
  organization: OrganizationDto;

  @ApiProperty({ example: 'tony@stark-industries.com' })
  @Expose()
  email: string;
}
