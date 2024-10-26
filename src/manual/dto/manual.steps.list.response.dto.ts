import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

import { ManualStep } from './manual.step.dto';

export class ManualStepsListResponseDto {
  @ApiProperty({ type: ManualStep, isArray: true })
  @Expose()
  @Type(() => ManualStep)
  data: ManualStep[];
}
