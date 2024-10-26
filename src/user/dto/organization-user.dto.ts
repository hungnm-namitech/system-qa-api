import { ApiProperty } from '@nestjs/swagger';
import { UserGender, UserRole } from '@prisma/client';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import * as dayjs from 'dayjs';

import { UserOrganizationWithUserAndOrganization } from '@/common/modules/prisma/prisma.types';

export class OrganizationUserDto {
  @ApiProperty({ example: '1375d14b-d22c-4250-b706-4cacec8bdb0d' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Stark Industries' })
  @Expose()
  company: string;

  @ApiProperty({ example: 'Tony Stark' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'tony@stark-industries.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: UserRole.MEMBER })
  @Expose()
  role: UserRole;

  @ApiProperty({ enum: UserGender })
  @Expose()
  gender: UserGender;

  @ApiProperty({ example: '1900-12-31' })
  @Expose()
  @Transform(
    ({ value }) => {
      if (value instanceof Date) {
        return dayjs(value).format('YYYY-MM-DD');
      }

      return null;
    },
    { toPlainOnly: true },
  )
  birthday: Date;

  @ApiProperty({ example: '2024-12-31' })
  @Expose()
  @Transform(
    ({ value }) => {
      return dayjs(value).format('YYYY-MM-DD');
    },
    { toPlainOnly: true },
  )
  joinedAt: Date;

  static fromEntity(
    entity: UserOrganizationWithUserAndOrganization,
  ): OrganizationUserDto {
    return plainToInstance(OrganizationUserDto, {
      id: entity.user.id,
      company: entity.organization.name,
      name: entity.user.name,
      email: entity.user.email,
      role: entity.role,
      gender: entity.user.gender,
      birthday: entity.user.birthday,
      joinedAt: entity.joinedAt,
    });
  }
}
