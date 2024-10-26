import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { Manual } from './manual.dto';

export class ManualListResponseDto {
  @ApiProperty({ type: Manual, isArray: true })
  @Expose()
  @Type(() => Manual)
  data: Manual[];
}
