import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UploadManualStepImageResponseDto {
  @ApiProperty()
  @Expose()
  path: string;

  @ApiProperty()
  @Expose()
  url: string;
}
