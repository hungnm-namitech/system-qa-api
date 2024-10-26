import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '@prisma/client';
import { Expose, Transform } from 'class-transformer';
import * as dayjs from 'dayjs';

export class AcceptInvitationSuccessfullyDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  gender: UserGender;

  @ApiProperty()
  @Expose()
  @Transform(
    ({ value }) => {
      if (value instanceof Date) {
        return dayjs(value).format('YYYY-MM-DD');
      }

      return '';
    },
    { toPlainOnly: true },
  )
  birthday: Date;

  constructor(email: string, name: string, gender: UserGender, birthday: Date) {
    this.email = email;
    this.name = name;
    this.gender = gender;
    this.birthday = birthday;
  }
}
