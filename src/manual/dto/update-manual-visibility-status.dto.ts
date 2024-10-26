import { ApiProperty } from '@nestjs/swagger';
import { VisibilityStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateManualVisibilityStatusDto {
  @ApiProperty({ enum: VisibilityStatus })
  @IsNotEmpty()
  @IsEnum(VisibilityStatus)
  status: VisibilityStatus;
}
