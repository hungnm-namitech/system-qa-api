import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ManualStep as ManualStepEntity } from '@prisma/client';
import { Expose, Transform } from 'class-transformer';
import * as dayjs from 'dayjs';

export class ManualStep {
  @ApiProperty({ example: '03178ce5-ca39-4f95-b098-6b3c86c373e6' })
  @Expose()
  id: string;

  @ApiProperty({ example: 1 })
  @Expose()
  step: number;

  @ApiPropertyOptional({ example: 'OPEN_URL' })
  @Expose()
  metadata?: { action?: string; target?: string };

  @ApiProperty({ example: 'SystemQAにアクセスする' })
  @Expose()
  description: string;

  @ApiProperty({
    example:
      'ダミーテキストが入ります。あああ。ダミーテキストが入ります。ダミーテキストが入ります。',
  })
  @Expose()
  instruction: string;

  @ApiProperty({
    example: 'https://domain.com/image.png',
  })
  @Expose()
  imageUrl: string;

  @ApiProperty({ example: '2024-12-31 12:59:59' })
  @Expose()
  @Transform(
    ({ value }) => {
      return value ? dayjs(value)?.format('YYYY-MM-DD HH:mm:ss') : undefined;
    },
    { toPlainOnly: true },
  )
  createdAt: Date;

  @ApiProperty({ example: '2024-12-31 12:59:59' })
  @Expose()
  @Transform(
    ({ value }) => {
      return value ? dayjs(value)?.format('YYYY-MM-DD HH:mm:ss') : undefined;
    },
    { toPlainOnly: true },
  )
  updatedAt: Date;

  static mapFromManualStepEntity(
    manualStep: ManualStepEntity,
    isGuest = false,
  ) {
    let stepContainUrl = false;
    let metadata: { action?: string; target?: { selector?: string } } = {};

    try {
      metadata = JSON.parse(manualStep.metadata);
      const targetUrl = new URL(metadata?.target?.selector ?? '');
      stepContainUrl = !!targetUrl;
    } catch {}

    if (isGuest) {
      return {
        step: manualStep.stepOrder,
        description: manualStep.description,
        instruction: manualStep.instruction,
        imageUrl: manualStep.imagePath,
        ...(stepContainUrl
          ? {
              metadata: {
                action: metadata?.action,
                target: metadata?.target?.selector,
              },
            }
          : {}),
      };
    }

    return {
      id: manualStep.id,
      step: manualStep.stepOrder,
      description: manualStep.description,
      instruction: manualStep.instruction,
      imageUrl: manualStep.imagePath,
      createdAt: manualStep.createdAt,
      updatedAt: manualStep.updatedAt,
      ...(stepContainUrl
        ? {
            metadata: {
              action: metadata?.action,
              target: metadata?.target?.selector,
            },
          }
        : {}),
    };
  }
}
