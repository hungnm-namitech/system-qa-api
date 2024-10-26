import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RetrieveUserCountDto {
  @ApiProperty()
  @Expose()
  total: number;
}
