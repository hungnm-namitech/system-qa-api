import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateManualStepItem {
  @ApiProperty({
    example: '138c7243-84cc-475d-92af-c8780cfab304',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'SystemQAにアクセスする' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @ApiProperty({
    example: `ダミーテキストが入ります。あああ。ダミーテキストが入ります。ダミーテキストが入ります`,
  })
  @IsString()
  @IsNotEmpty()
  instruction: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  step: number;

  @ApiProperty({ example: '/images/step1.png' })
  @IsString()
  imagePath: string;

  @IsOptional()
  metadata?: string | undefined;
}

export class UpdateManualStepsDto {
  @ApiProperty({ example: 'SystemQAの使い方' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ type: UpdateManualStepItem, isArray: true })
  @IsArray()
  steps: UpdateManualStepItem[];

  @ApiProperty({
    type: String,
    isArray: true,
    example: [
      '9038bd75-fc8b-4e3c-b6a7-e857d04439d4',
      '6a033a81-62bd-4a30-859d-b13fd0475f89',
    ],
  })
  @IsArray()
  deleteStepIds: string[];

  @ApiProperty({
    type: String,
    example:
      'manual-videos-temp/2024-06-21/220f0569-044e-4d32-97af-a415e187d9a7.mp4',
    required: false,
  })
  @IsString()
  @IsOptional()
  videoPath: string | undefined;
}
