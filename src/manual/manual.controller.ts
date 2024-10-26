import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { User, VisibilityStatus } from '@prisma/client';
import { memoryStorage } from 'multer';

import { AllowGuest, ApiBearerAuthGuard } from '@/auth/auth.guard';
import { AuthenticatedUser } from '@/auth/authenticated-user.decorator';

import { CreateManualDto } from './dto/create-manual.dto';
import { Manual } from './dto/manual.dto';
import { ManualListResponseDto } from './dto/manual.list.response.dto';
import { ManualStepsListResponseDto } from './dto/manual.steps.list.response.dto';
import { UpdateManualStepsDto } from './dto/update-manual-steps.dto';
import { UpdateManualVisibilityStatusDto } from './dto/update-manual-visibility-status.dto';
import { UploadManualStepImageResponseDto } from './dto/upload-manual-step-image-response.dto';
import { ManualService } from './manual.service';

@Controller('api/manuals')
@ApiTags('manual')
@UseInterceptors(ClassSerializerInterceptor)
export class ManualController {
  constructor(private readonly manualService: ManualService) {}

  @ApiOperation({ summary: 'Create new manual' })
  @ApiBearerAuthGuard()
  @ApiOkResponse({ type: Manual })
  @ApiBadRequestResponse()
  @ApiUnprocessableEntityResponse()
  @Post()
  async create(
    @AuthenticatedUser() user: User,
    @Body() { steps, videoPath }: CreateManualDto,
  ): Promise<Manual> {
    return this.manualService.create(user, steps, videoPath);
  }

  @ApiOperation({ summary: 'Get list of manuals' })
  @ApiBearerAuthGuard()
  @ApiOkResponse({ type: ManualListResponseDto })
  @ApiQuery({
    name: 'visibilityStatus',
    required: false,
    enum: VisibilityStatus,
  })
  @Get()
  async getManualOfUser(
    @AuthenticatedUser() user: User,
    @Query('visibilityStatus') visibilityStatus: VisibilityStatus | undefined,
  ): Promise<ManualListResponseDto> {
    return this.manualService.getManualOfUser(user, { visibilityStatus });
  }

  @ApiOperation({ summary: 'Retrieve URL for manual video upload' })
  @Get('upload-video-url')
  @ApiOkResponse({
    description: 'URL successfully generated for manual video upload',
  })
  @ApiBearerAuthGuard()
  async getManualVideoUploadUrl() {
    return this.manualService.createManualVideoUploadUrl();
  }

  @ApiOperation({ summary: 'Get manual detail' })
  @AllowGuest(true)
  @ApiBearerAuthGuard()
  @ApiOkResponse({ type: Manual })
  @Get(':id')
  async getManualDetail(
    @AuthenticatedUser() user: User,
    @Param('id') id: string,
  ): Promise<Manual> {
    return this.manualService.getManualDetail(id, user);
  }

  @ApiOperation({ summary: 'Get manual steps' })
  @AllowGuest(true)
  @ApiBearerAuthGuard()
  @ApiOkResponse({ type: ManualStepsListResponseDto })
  @Get(':id/steps')
  async getManualSteps(
    @AuthenticatedUser() user: User,
    @Param('id') id: string,
  ): Promise<ManualStepsListResponseDto> {
    return this.manualService.getManualStepsById(id, user);
  }

  @ApiOperation({ summary: 'Create or update manual' })
  @ApiBearerAuthGuard()
  @ApiOkResponse({ type: ManualStepsListResponseDto })
  @Put(':id')
  async updateManualSteps(
    @AuthenticatedUser() user: User,
    @Param('id') id: string,
    @Body() payload: UpdateManualStepsDto,
  ) {
    return this.manualService.updateManualSteps(id, payload, user);
  }

  @ApiOperation({ summary: 'Upload image file for manual' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    description:
      'The ID of the manual. Use the string "new" if you are uploading a new manual.',
  })
  @ApiBearerAuthGuard()
  @ApiOkResponse({ type: UploadManualStepImageResponseDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @Post(':id/steps/upload')
  async uploadManualStepImage(
    @AuthenticatedUser() user: User,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 5 * 1000 * 1000,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ): Promise<UploadManualStepImageResponseDto> {
    const { fileTypeFromBuffer } = await eval(`import('file-type')`);
    const allowedFileTypes = ['image/png', 'image/jpeg'];
    const { mime } = (await fileTypeFromBuffer(file.buffer)) ?? {};

    if (!allowedFileTypes.includes(mime)) {
      throw new UnprocessableEntityException({
        error: {
          unsupportedFileType: `${mime || 'file type'} is not supported. Supported file types are: ${allowedFileTypes.join(', ')}.`,
        },
      });
    }

    return await this.manualService.handleManualStepImageUpload(id, user, {
      ...file,
      mimetype: mime,
    });
  }

  @ApiOperation({ summary: 'Delete manual' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuthGuard()
  async deleteManual(@AuthenticatedUser() user: User, @Param('id') id: string) {
    await this.manualService.destroy(user, id);

    return '';
  }

  @ApiOperation({ summary: 'Update manual visibility status' })
  @Put(':id/visibility')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: Manual })
  @ApiNotFoundResponse()
  @ApiBearerAuthGuard()
  async updateVisibilityStatus(
    @AuthenticatedUser() user: User,
    @Param('id') id: string,
    @Body() { status }: UpdateManualVisibilityStatusDto,
  ) {
    return this.manualService.updateVisibilityStatus(user, id, status);
  }

  @Get('public/organization/:organizationId')
  async getPublicManualsByOrganization(
    @Param('organizationId') organizationId: string
  ): Promise<{ data: Manual[] }> {
    return this.manualService.getPublicManualsByOrganization(organizationId);
  }
}
