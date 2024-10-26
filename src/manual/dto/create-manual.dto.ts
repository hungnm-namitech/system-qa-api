import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBase64,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { ManualAction } from '../manual.const';

export class ManualStepTargetElement {
  @ApiProperty({
    type: String,
    example: 'button[name="register"]',
    required: false,
  })
  @IsString()
  @IsOptional()
  selector?: string | undefined;

  @ApiProperty({ type: String, example: '新規登録', required: false })
  @IsString()
  @IsOptional()
  label?: string | undefined;

  @ApiProperty({ type: String, example: '', required: false })
  @IsString()
  @IsOptional()
  text?: string | undefined;
}

export class CreateManualStepDto {
  @ApiProperty({ enum: ManualAction })
  @IsNotEmpty()
  @IsEnum(ManualAction)
  action: ManualAction;

  @ApiProperty({ type: String, example: '06:09' })
  @IsString()
  @IsNotEmpty()
  actionAt: string;

  @ApiProperty({ type: ManualStepTargetElement, required: false })
  @IsOptional()
  target?: ManualStepTargetElement | undefined;
}

export class CreateManualDto {
  @ApiProperty({ type: CreateManualStepDto, isArray: true })
  @IsArray()
  steps: CreateManualStepDto[];

  @ApiProperty({
    type: String,
    example:
      'manual-videos-temp/2024-06-21/220f0569-044e-4d32-97af-a415e187d9a7.mp4',
    required: false,
  })
  @IsString()
  @IsOptional()
  videoPath?: string | undefined;
}
