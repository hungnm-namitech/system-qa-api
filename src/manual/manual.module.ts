import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { SqsConfig, SqsModule, SqsQueueType } from '@/common/modules/aws-sqs';
import { Env, env } from '@/env';

import { ManualController } from './manual.controller';
import { ManualService } from './manual.service';
import { ManualVideoScreenshotHandler } from './manual-video-screenshot.handler';

@Module({
  imports: [
    MulterModule,
    SqsModule.forRootAsync({
      inject: [ConfigService],
      useFactory(config: ConfigService<Env, true>) {
        return new SqsConfig({
          region: config.get('AWS_REGION'),
          endpoint: config.get('AWS_SQS_ENDPOINT'),
          accountNumber: config.get('AWS_SQS_ACCOUNT_NUMBER'),
        });
      },
    }),
    SqsModule.registerQueue({
      name: env.AWS_SQS_QUEUE_NAME,
      type: SqsQueueType.All,
    }),
  ],
  controllers: [ManualController],
  providers: [ManualService, ManualVideoScreenshotHandler],
})
export class ManualModule {}
