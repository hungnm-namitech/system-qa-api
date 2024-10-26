import * as path from 'node:path';

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ManualStep as ManualStepEntity,
  Prisma,
  ProcessingStatus,
  User,
  VisibilityStatus,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import * as dayjs from 'dayjs';

import { SqsService } from '@/common/modules/aws-sqs';
import { PrismaService } from '@/common/modules/prisma/prisma.service';
import { ManualWithAuthor } from '@/common/modules/prisma/prisma.types';
import { Env } from '@/env';

import { CreateManualStepDto } from './dto/create-manual.dto';
import { Manual } from './dto/manual.dto';
import { ManualListResponseDto } from './dto/manual.list.response.dto';
import { ManualStep } from './dto/manual.step.dto';
import { ManualStepsListResponseDto } from './dto/manual.steps.list.response.dto';
import {
  UpdateManualStepItem,
  UpdateManualStepsDto,
} from './dto/update-manual-steps.dto';
import { UploadManualStepImageResponseDto } from './dto/upload-manual-step-image-response.dto';
import { CreateManualFailException } from './exceptions/create-manual-fail.exception';
import { ManualAction } from './manual.const';

@Injectable()
export class ManualService {
  private readonly logger = new Logger(ManualService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly sqsService: SqsService,
  ) {}

  async create(
    user: User,
    steps: CreateManualStepDto[],
    videoPath: string | undefined = undefined,
  ): Promise<Manual> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!userOrganization) {
      throw new NotFoundException(
        "Oops! Something went wrong. It looks like we couldn't find your organization. Please double-check your details and try again.",
      );
    }

    let manual: ManualWithAuthor | null | undefined;

    try {
      manual = await this.prisma.manual.create({
        data: {
          organizationId: userOrganization.organizationId,
          authorId: user.id,
          title: 'Untitled',
          visibilityStatus: VisibilityStatus.PRIVATE,
          processingStatus: ProcessingStatus.WAITING,
        },
        include: {
          author: true,
        },
      });

      if (videoPath) {
        const newVideoPath = `manuals/${manual.id}/screencast.mp4`;
        await this.handleMoveUploadedManualVideo(videoPath, newVideoPath);
        await this.prisma.manual.update({
          where: {
            id: manual.id,
          },
          data: {
            videoPath: newVideoPath,
          },
        });
      }
    } catch (err) {
      this.logger.error(err);

      if (manual && manual?.id) {
        await this.prisma.manual
          .delete({
            where: {
              id: manual.id,
            },
          })
          .catch(() => null);
      }

      throw new CreateManualFailException();
    }

    if (!manual) {
      throw new CreateManualFailException();
    }

    try {
      const manualSteps = steps.map<UpdateManualStepItem>((step, index) => {
        const { description, instruction } = this.generateStepInstruction(step);

        return {
          description,
          instruction,
          step: index + 1,
          metadata: JSON.stringify({
            action: step.action,
            actionAt: step.actionAt,
            target: step?.target ?? {},
          }),
        } as UpdateManualStepItem;
      });

      await this.prisma.manualStep.createMany({
        data: manualSteps.map((step) => {
          return {
            manualId: manual.id,
            stepOrder: step.step,
            description: step.description,
            instruction: step.instruction,
            imagePath: step.imagePath,
            metadata: step.metadata,
          };
        }),
      });

      await this.sqsService.send(this.config.get('AWS_SQS_QUEUE_NAME'), {
        id: `manual-${manual.id}`,
        body: {
          manual: {
            id: manual.id,
          },
        },
        groupId: `manuals-screenshots`,
        deduplicationId: `manual-${manual.id}`,
      });
    } catch {
      await this.prisma.manual
        .delete({
          where: {
            id: manual.id,
          },
        })
        .catch(() => null);

      throw new CreateManualFailException();
    }

    return Manual.mapFromManualAuthorEntity(manual);
  }

  async getManualOfUser(
    user: User,
    filters: { visibilityStatus: VisibilityStatus | null } | null = null,
  ): Promise<ManualListResponseDto> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!userOrganization) {
      return new ManualListResponseDto();
    }

    const where: Prisma.ManualWhereInput = {};

    if ('visibilityStatus' in filters && filters.visibilityStatus) {
      where.visibilityStatus = filters.visibilityStatus;
    }

    const manuals = await this.prisma.manual.findMany({
      where: {
        ...where,
        organizationId: userOrganization.organizationId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
      },
    });

    return plainToInstance(ManualListResponseDto, {
      data: manuals.map((manual) => {
        return Manual.mapFromManualAuthorEntity(manual);
      }),
    });
  }

  async getPublicManualsByOrganization(
    organizationId: string,
  ): Promise<{ data: Manual[] }> {
    const manuals = await this.prisma.manual.findMany({
      where: {
        organizationId: organizationId,
        visibilityStatus: 'PUBLIC',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
      },
    });

    if (!manuals.length) {
      throw new NotFoundException(
        `No public manuals found for organization with id ${organizationId}`,
      );
    }

    return {
      data: manuals.map((manual) => Manual.mapFromManualAuthorEntity(manual)),
    };
  }

  async getManualDetail(id: string, user: User): Promise<Manual> {
    if (user) {
      await this.ensureUserIsManualOwner(user.id, id);
    }

    const manual = await this.prisma.manual.findUnique({
      where: {
        id,
      },
      include: {
        author: true,
      },
    });

    if (
      !manual ||
      (!user && manual.visibilityStatus !== VisibilityStatus.PUBLIC)
    ) {
      throw new NotFoundException(`Manual with id ${manual.id} not found`);
    }

    return plainToInstance(
      Manual,
      Manual.mapFromManualAuthorEntity(manual, user === null),
    );
  }

  async getManualStepsById(
    id: string,
    user: User | null,
  ): Promise<ManualStepsListResponseDto> {
    if (user) {
      await this.ensureUserIsManualOwner(user.id, id);
    }

    const manual = await this.prisma.manual.findUnique({
      where: {
        id,
      },
      include: {
        manualSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (
      !manual ||
      (!user && manual.visibilityStatus !== VisibilityStatus.PUBLIC)
    ) {
      throw new NotFoundException(`Manual with id ${manual.id} not found`);
    }

    return plainToInstance(ManualStepsListResponseDto, {
      data: await Promise.all(
        manual.manualSteps.map(async (manualStep) => {
          return ManualStep.mapFromManualStepEntity(
            await this.mapManualStepImagePathToImageUrl(manualStep),
            user === null,
          );
        }),
      ),
    });
  }

  async updateManualSteps(
    id: string,
    payload: UpdateManualStepsDto,
    user: User,
  ) {
    await this.ensureUserIsManualOwner(user.id, id);

    const manual = await this.prisma.manual.findUnique({
      where: {
        id,
      },
    });

    const steps = await this.handleMoveUploadedStepsImage(
      manual.id,
      payload.steps,
    );
    const updateSteps = steps.filter((step) => !!step?.id);
    const newSteps = steps.filter((step) => !step?.id);

    let newVideoPath = null;
    if (payload.videoPath) {
      try {
        newVideoPath = `manuals/${manual.id}/screencast.mp4`;
        await this.handleMoveUploadedManualVideo(
          payload.videoPath,
          newVideoPath,
        );
      } catch {
        newVideoPath = manual.videoPath;
      }
    }

    await this.prisma.$transaction([
      this.prisma.manual.update({
        where: {
          id: manual.id,
        },
        data: {
          title: payload.title,
          videoPath: newVideoPath,
        },
      }),
      ...updateSteps.map((step) => {
        return this.prisma.manualStep.upsert({
          where: {
            manualStepIdWithManualId: {
              id: step.id,
              manualId: manual.id,
            },
          },
          create: {
            manual: {
              connect: {
                id: manual.id,
              },
            },
            stepOrder: step.step,
            description: step.description,
            instruction: step.instruction,
            imagePath: step.imagePath,
          },
          update: {
            stepOrder: step.step,
            description: step.description,
            instruction: step.instruction,
            imagePath: step.imagePath,
          },
        });
      }),
      ...newSteps.map((step) => {
        return this.prisma.manualStep.create({
          data: {
            manual: {
              connect: {
                id: manual.id,
              },
            },
            stepOrder: step.step,
            description: step.description,
            instruction: step.instruction,
            imagePath: step.imagePath,
          },
        });
      }),
      this.prisma.manualStep.deleteMany({
        where: {
          id: {
            in: payload.deleteStepIds,
          },
          manualId: manual.id,
        },
      }),
    ]);

    const updatedManualSteps = await this.prisma.manualStep.findMany({
      where: {
        manualId: manual.id,
      },
    });

    return plainToInstance(ManualStepsListResponseDto, {
      data: await Promise.all(
        updatedManualSteps.map(async (manualStep) => {
          return ManualStep.mapFromManualStepEntity(
            await this.mapManualStepImagePathToImageUrl(manualStep),
          );
        }),
      ),
    });
  }

  async handleManualStepImageUpload(
    manualId: string,
    user: User,
    file: Express.Multer.File,
  ): Promise<UploadManualStepImageResponseDto> {
    if (manualId !== 'new') {
      await this.ensureUserIsManualOwner(user.id, manualId);
    }

    const storagePath = `manuals-temp/${dayjs().format('YYYY-MM-DD')}`;
    const ext = path.extname(file.originalname) || '.png';
    const filename = `${manualId}--${randomUUID().toString()}${ext.toLowerCase()}`;
    const s3Client = new S3Client({ region: 'ap-northeast-1' });
    const command = new PutObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      Key: `${storagePath}/${filename}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await s3Client.send(command);

      return plainToInstance(UploadManualStepImageResponseDto, {
        path: `${storagePath}/${filename}`,
        url: await this.generateImageUrl(`${storagePath}/${filename}`),
      });
    } catch {}

    throw new BadRequestException({
      error: {
        s3UploadFailed: `Failed to upload the file. Please try again later or contact support if the issue persists.`,
      },
    });
  }

  async destroy(user: User, id: string) {
    await this.ensureUserIsManualOwner(user.id, id);

    await this.deleteAllManualFiles(id);

    await this.prisma.manual.delete({
      where: {
        id,
      },
    });
  }

  async updateVisibilityStatus(
    user: User,
    id: string,
    status: VisibilityStatus,
  ): Promise<Manual> {
    await this.ensureUserIsManualOwner(user.id, id);

    await this.prisma.manual.update({
      where: {
        id,
      },
      data: {
        visibilityStatus: status,
      },
    });

    const manual = await this.prisma.manual.findUnique({
      where: {
        id,
      },
      include: {
        author: true,
      },
    });

    return Manual.mapFromManualAuthorEntity(manual);
  }

  async createManualVideoUploadUrl(): Promise<PresignedPost> {
    const s3Client = new S3Client({ region: 'ap-northeast-1' });
    const filename = `${randomUUID().toString()}.mp4`;
    const storagePath = `manual-videos-temp/${dayjs().format('YYYY-MM-DD')}`;
    const Bucket = this.config.get('MANUAL_FILES_S3_BUCKET_NAME');
    const Key = `${storagePath}/${filename}`;
    const maxFileSize = 1000 * 1000 * 1000; // 1GB in bytes

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket,
      Key,
      Conditions: [
        { bucket: Bucket },
        { key: Key },
        ['content-length-range', 1000, maxFileSize],
        ['eq', '$Content-Type', 'video/mp4'],
      ],
      Expires: 2 * 60 * 60, // 2 hours
    });

    return { url, fields };
  }

  private async handleMoveUploadedStepsImage(
    manualId: string,
    steps: UpdateManualStepItem[],
  ): Promise<UpdateManualStepItem[]> {
    const imageMovedSteps: UpdateManualStepItem[] = [];

    for (const step of steps) {
      if (
        !('imagePath' in step) ||
        !step?.imagePath ||
        !step?.imagePath?.startsWith('manuals-temp/')
      ) {
        imageMovedSteps.push({ ...step });
      } else {
        const ext = path.extname(step.imagePath) || '.png';
        const filename = `${randomUUID().toString()}${ext.toLowerCase()}`;
        const stepIndex = step.step.toString(10).padStart(3, '0');
        const storagePath = `manuals/${manualId}/step-${stepIndex}-${filename}`;
        const newImagePath = await this.handleMoveUploadedStepImage(
          step.imagePath,
          storagePath,
        );

        imageMovedSteps.push({ ...step, imagePath: newImagePath });
      }
    }

    return imageMovedSteps;
  }

  private async handleMoveUploadedStepImage(
    path: string,
    newPath: string,
  ): Promise<string> {
    const s3Client = new S3Client({ region: 'ap-northeast-1' });
    const copyCmd = new CopyObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      CopySource: `${this.config.get('MANUAL_FILES_S3_BUCKET_NAME')}/${path}`,
      Key: newPath,
    });
    const deleteCmd = new DeleteObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      Key: path,
    });

    try {
      await s3Client.send(copyCmd);
      await s3Client.send(deleteCmd).catch(() => null);

      return newPath;
    } catch {}

    return null;
  }

  private async generateImageUrl(path: string): Promise<string> {
    const s3Client = new S3Client({ region: 'ap-northeast-1' });

    return getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
        Key: path,
      }),
      { expiresIn: 24 * 60 * 60 },
    );
  }

  private async mapManualStepImagePathToImageUrl(
    step: ManualStepEntity,
  ): Promise<ManualStepEntity> {
    if (!step.imagePath) {
      return step;
    }

    return {
      ...step,
      imagePath: await this.generateImageUrl(step.imagePath),
    };
  }

  private async ensureUserIsManualOwner(
    userId: string,
    manualId: string,
  ): Promise<void> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
      },
    });

    if (!userOrganization) {
      throw new NotFoundException(`Manual with id ${manualId} not found`);
    }

    const manual = await this.prisma.manual.findUnique({
      where: {
        id: manualId,
      },
    });

    if (!manual || manual.organizationId !== userOrganization.organizationId) {
      throw new NotFoundException(`Manual with id ${manualId} not found`);
    }
  }

  private generateStepInstruction(step: CreateManualStepDto): {
    description: string;
    instruction: string;
  } {
    const maxLength = 50;

    switch (step?.action) {
      case ManualAction.INITIAL_TAB:
        return {
          description: step?.target?.label
            ? `${step?.target?.label}（${step?.target?.selector}）にアクセス`
            : `${step?.target?.selector}にアクセス`,
          instruction: ``,
        };
      case ManualAction.CLICK:
        return {
          description: `「${step?.target?.label ?? 'ここ'}」をクリックしてください`,
          instruction: ``,
        };
      case ManualAction.INPUT:
        return {
          description: `「${step?.target?.text ?? ''}」と入力してください`,
          instruction: ``,
        };
      case ManualAction.OPEN_URL:
        return {
          description: step?.target?.label
            ? `${step?.target?.label}（${step?.target?.selector}）にアクセス`
            : `${step?.target?.selector}にアクセス`,
          instruction: ``,
        };
      case ManualAction.CHANGE_TAB:
        return {
          description: `タブを切替える`,
          instruction: ``,
        };
      default:
        return { description: '', instruction: '' };
    }
  }

  private async handleMoveUploadedManualVideo(
    currentPath: string,
    newPath: string,
  ): Promise<string> {
    const s3Client = new S3Client({ region: 'ap-northeast-1' });
    const copyCmd = new CopyObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      CopySource: `${this.config.get('MANUAL_FILES_S3_BUCKET_NAME')}/${currentPath}`,
      Key: newPath,
    });
    const deleteCmd = new DeleteObjectCommand({
      Bucket: this.config.get('MANUAL_FILES_S3_BUCKET_NAME'),
      Key: currentPath,
    });

    try {
      await s3Client.send(copyCmd);
      await s3Client.send(deleteCmd).catch(() => null);

      return newPath;
    } catch (err) {
      throw new Error(
        `Failed to move video from ${currentPath} to ${newPath}: ${err?.message ?? 'Unknown error'}`,
      );
    }
  }

  private async deleteAllManualFiles(manualId: string) {
    const bucket = this.config.get('MANUAL_FILES_S3_BUCKET_NAME');
    const location = `manuals/${manualId}`;

    await this.deleteS3Folder({ bucket, location });
  }

  private async deleteS3Folder({ bucket, location }) {
    const s3 = new S3Client({ region: 'ap-northeast-1' });

    let count = 0;

    async function recursiveDelete(token: string | null = null) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: location,
        ContinuationToken: token,
      });
      const list = await s3.send(listCommand);

      if (list.KeyCount) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: list.Contents.map((item) => ({ Key: item.Key })),
            Quiet: false,
          },
        });
        const deleted = await s3.send(deleteCommand);
        count += deleted.Deleted.length;
        if (deleted.Errors) {
          deleted.Errors.map((error) =>
            console.log(`${error.Key} could not be deleted - ${error.Code}`),
          );
        }
      }

      if (list.NextContinuationToken) {
        await recursiveDelete(list.NextContinuationToken);
      }

      return `${count} files deleted.`;
    }

    return await recursiveDelete();
  }
}
