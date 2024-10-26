import * as fs from 'node:fs';

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Message } from '@aws-sdk/client-sqs';
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  InlineDataPart,
  TextPart,
} from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManualStep, ProcessingStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as ffmpegPath from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';
import * as FfmpegCommand from 'fluent-ffmpeg';
import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, dirname, join } from 'path';
import { Readable } from 'stream';

import { SqsMessageHandler, SqsProcess } from '@/common/modules/aws-sqs';
import { PrismaService } from '@/common/modules/prisma/prisma.service';
import { ManualWithSteps } from '@/common/modules/prisma/prisma.types';
import { Env, env } from '@/env';

interface ManualScreenshotQueueBody extends Record<string, unknown> {
  manual: {
    id: string;
  };
}

@SqsProcess(env.AWS_SQS_QUEUE_NAME)
export class ManualVideoScreenshotHandler {
  private readonly logger = new Logger(ManualVideoScreenshotHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @SqsMessageHandler(false)
  public async handleMessage(message: Message) {
    const body = this.parseBody(message?.Body ?? '');

    if ('manual' in body && body?.manual?.id) {
      await this.handle(body?.manual?.id);
    }
  }

  private parseBody(body: string): ManualScreenshotQueueBody {
    try {
      return JSON.parse(body);
    } catch {}

    return null;
  }

  private async handle(id: string) {
    const manual = await this.prisma.manual.findUnique({
      where: {
        id,
      },
      include: {
        manualSteps: true,
      },
    });

    if (!manual || manual.processingStatus !== ProcessingStatus.WAITING) {
      this.logger.log(
        `END: manual with ID ${id} does not exist or has already been processed.`,
      );

      return;
    }

    await this.prisma.manual.update({
      where: {
        id,
      },
      data: {
        processingStatus: ProcessingStatus.PROCESSING,
      },
    });

    let tempDir: string | null = null;

    tempDir = await this.createTemporaryDirectory(`systemqa-manual`);

    if (!tempDir) {
      throw new Error(
        `Failed to create temporary directory for manual processing.`,
      );
    }

    const steps = await this.generateScreenshotFromVideo(manual, tempDir);
    await this.generateManualTitle(manual, steps);

    if (tempDir) {
      await this.cleanup(tempDir);
    }
  }

  private async generateScreenshotFromVideo(
    manual: ManualWithSteps,
    tempDir: string,
  ): Promise<Array<{ description: string; imagePath?: string }>> {
    this.logger.log(`START: create step screenshots for manual ${manual.id}`);

    const steps: Array<{ description: string; imagePath?: string }> = [];

    try {
      const sourcePath = await this.downloadSourceFile(
        manual.videoPath,
        tempDir,
      );

      if (!sourcePath) {
        throw new Error(
          `Failed to download source file from ${manual.videoPath} to ${tempDir}.`,
        );
      }

      const storageBasePath = dirname(manual.videoPath);

      for (const step of manual.manualSteps) {
        const stepScreenshotPath = await this.generateStepScreenshot(
          step,
          sourcePath,
          tempDir,
        );

        steps.push({
          description: step.description,
          imagePath: stepScreenshotPath,
        });

        if (!stepScreenshotPath) {
          continue;
        }

        const filename = basename(stepScreenshotPath);
        const imagePath = await this.uploadToS3Bucket(
          stepScreenshotPath,
          `${storageBasePath}/${filename}`,
        );

        await this.prisma.manualStep.update({
          where: {
            id: step.id,
          },
          data: {
            imagePath,
          },
        });
      }

      await this.prisma.manual.update({
        where: {
          id: manual.id,
        },
        data: {
          processingStatus: ProcessingStatus.SUCCESS,
        },
      });
    } catch (err) {
      await this.prisma.manual.update({
        where: {
          id: manual.id,
        },
        data: {
          processingStatus: ProcessingStatus.FAIL,
        },
      });
      this.logger.error(err);
    }

    this.logger.log(`END: create step screenshots for manual ${manual.id}`);

    return steps;
  }

  private async generateManualTitle(
    manual: ManualWithSteps,
    steps: Array<{ description: string; imagePath?: string }>,
  ): Promise<void> {
    const manualStepsPrompt: Array<TextPart | InlineDataPart> = steps.flatMap(
      (step, index) => {
        if (!step.imagePath) {
          return {
            text: `手順${index + 1}: ${step.description}`,
          };
        }

        return [
          {
            text: `手順${index + 1}: ${step.description}`,
          },
          {
            inlineData: {
              data: Buffer.from(fs.readFileSync(step.imagePath)).toString(
                'base64',
              ),
              mimeType: 'image/png',
            },
          } as InlineDataPart,
        ];
      },
    );

    const prompt = `以下の各手順と対応する画像を見て、この手順書のタイトルだけを生成してください。出力にはMarkdownやその他の書式設定は含めないでください。以下は例です：

例1：
手順1: ChatGPTアカウントの作成
手順2: メールアドレスの入力
手順3: パスワードの設定
タイトル: ChatGPTアカウントの作成方法

例2：
手順1: 銀行システムへのログイン
手順2: ユーザー名の入力
手順3: パスワードの入力
タイトル: 銀行システムへのログイン方法

例3：
手順1: コンピュータの起動
手順2: デスクトップの表示
手順3: 基本的な操作方法
タイトル: コンピュータの使い方ガイド`;

    this.logger.debug(`generateTitle -> prompt: ${prompt}`);

    const genAI = new GoogleGenerativeAI(
      this.config.get('GOOGLE_GEMINI_API_KEY'),
    );
    const model = genAI.getGenerativeModel({
      model: this.config.get('GOOGLE_GEMINI_MODEL_NAME', 'gemini-1.5-pro'),
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 500,
        temperature: 0,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const result = await model.generateContent([prompt, ...manualStepsPrompt]);
    const title = result.response.text();

    this.logger.debug(`generateTitle -> ${title}`);

    await this.prisma.manual.update({
      where: {
        id: manual.id,
      },
      data: {
        title,
      },
    });
  }

  private async createTemporaryDirectory(prefix: string): Promise<string> {
    let tmpDir: string;

    try {
      tmpDir = await mkdtemp(join(tmpdir(), prefix));

      return tmpDir;
    } catch {
      return null;
    }
  }

  private async downloadSourceFile(
    sourcePath: string,
    destination: string,
  ): Promise<string> {
    const s3Client = new S3Client({ region: 'ap-northeast-1' });
    const command = new GetObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      Key: sourcePath,
    });

    try {
      const filename = basename(sourcePath);
      const object = await s3Client.send(command);

      await new Promise<void>((resolve, reject) => {
        if (object.Body instanceof Readable) {
          object.Body.pipe(fs.createWriteStream(`${destination}/${filename}`))
            .on('error', (err) => reject(err))
            .on('close', () => resolve());
        }
      });

      return `${destination}/${filename}`;
    } catch {
      return null;
    }
  }

  private async generateStepScreenshot(
    step: ManualStep,
    sourcePath: string,
    destination: string,
  ) {
    const metadata = JSON.parse(step.metadata) as { actionAt?: string };

    if (
      metadata?.actionAt === null ||
      metadata?.actionAt === '' ||
      metadata?.actionAt === undefined
    ) {
      return;
    }

    const stepIndex = step.stepOrder.toString(10).padStart(3, '0');
    const filename = `step-${stepIndex}-${randomUUID().toString()}.png`;

    await new Promise<void>(async (resolve, reject) => {
      FfmpegCommand(sourcePath, {})
        .setFfmpegPath(ffmpegPath as unknown as string)
        .setFfprobePath(ffprobePath)
        .on('end', resolve)
        .on('error', reject)
        .screenshot({
          count: 1,
          timestamps: [this.formatMilliseconds(Number(metadata.actionAt))],
          filename: filename,
          folder: destination,
        });
    });

    const isSuccess = await stat(`${destination}/${filename}`)
      .then(() => true)
      .catch(() => false);

    return isSuccess ? `${destination}/${filename}` : null;
  }

  private async uploadToS3Bucket(source: string, destination: string) {
    const s3Client = new S3Client({ region: 'ap-northeast-1' });
    const command = new PutObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      Key: destination,
      Body: fs.createReadStream(source),
      ContentType: 'image/png',
    });

    try {
      await s3Client.send(command);

      return destination;
    } catch {}

    return null;
  }

  private async cleanup(tempDir: string) {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  }

  private formatMilliseconds(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedMilliseconds = String(milliseconds).padStart(3, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
  }
}
