import { ApiProperty } from '@nestjs/swagger';
import { ProcessingStatus, VisibilityStatus } from '@prisma/client';
import { Expose, Transform, Type } from 'class-transformer';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

import { ManualWithAuthor } from '@/common/modules/prisma/prisma.types';

import { ManualAuthor } from './manual.author';

dayjs.extend(utc);
dayjs.extend(timezone);

export class Manual {
  @ApiProperty({ example: '3f8ca704-ad82-4862-a1c3-36568e674aa6' })
  @Expose()
  id: string;

  @ApiProperty({ example: '勤怠管理について' })
  @Expose()
  title?: string;

  @ApiProperty({ enum: VisibilityStatus })
  @Expose()
  visibilityStatus?: VisibilityStatus;

  @ApiProperty({ enum: ProcessingStatus })
  @Expose()
  processingStatus?: ProcessingStatus;

  @ApiProperty({ type: ManualAuthor })
  @Expose()
  @Type(() => ManualAuthor)
  author: ManualAuthor;

  @ApiProperty({})
  @Expose()
  url?: string;

  @ApiProperty({ example: '2024-12-31 12:59:59' })
  @Expose()
  @Transform(
    ({ value }) => {
      return value ? dayjs(value).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss') : undefined;
    },
    { toPlainOnly: true },
  )
  createdAt?: Date;

  @ApiProperty({ example: '2024-12-31 12:59:59' })
  @Expose()
  @Transform(
    ({ value }) => {
      return value ? dayjs(value).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss') : undefined;
    },
    { toPlainOnly: true },
  )
  updatedAt?: Date;

  static mapFromManualAuthorEntity(
    manual: ManualWithAuthor,
    isGuest = false,
  ): Manual {
    if (isGuest) {
      return {
        id: manual.id,
        title: manual.title,
        author: {
          id: manual.author.id,
          name: manual.author.name,
        },
        createdAt: manual.createdAt,
        updatedAt: manual.updatedAt,
      };
    }

    const publicBaseUrl = process.env.WEBAPP_MANUAL_PUBLIC_URL.replace(
      encodeURIComponent('{id}'),
      manual.id,
    );

    return {
      id: manual.id,
      title: manual.title,
      visibilityStatus: manual.visibilityStatus,
      processingStatus: manual.processingStatus,
      author: {
        id: manual.author.id,
        name: manual.author.name,
      },
      url:
        manual.visibilityStatus === VisibilityStatus.PUBLIC
          ? publicBaseUrl.toString()
          : null,
      createdAt: manual.createdAt,
      updatedAt: manual.updatedAt,
    };
  }
}
