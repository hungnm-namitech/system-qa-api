import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Type } from 'class-transformer';

import { UserOrganizationWithUser } from '@/common/modules/prisma/prisma.types';

import { OrganizationUserDto } from './organization-user.dto';

export class ListOrganizationUsersDto {
  @ApiProperty({ type: OrganizationUserDto, isArray: true })
  @Expose()
  @Type(() => OrganizationUserDto)
  users: OrganizationUserDto[];

  static fromUserOrganizationEntities(
    entities: UserOrganizationWithUser[],
  ): ListOrganizationUsersDto {
    const users = entities.map((entity) => {
      return {
        id: entity.user.id,
        name: entity.user.name,
        email: entity.user.email,
        role: entity.role,
        gender: entity.user.gender,
        birthday: entity.user.birthday,
        joinedAt: entity.joinedAt,
      };
    });

    return plainToInstance(ListOrganizationUsersDto, { users });
  }
}
