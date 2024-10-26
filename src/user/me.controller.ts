import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';

import { ApiBearerAuthGuard } from '@/auth/auth.guard';
import { AuthenticatedUser } from '@/auth/authenticated-user.decorator';

import { OrganizationUserDto } from './dto/organization-user.dto';
import { UserService } from './user.service';

@ApiTags('me')
@Controller('api/me')
@UseInterceptors(ClassSerializerInterceptor)
export class MeController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: OrganizationUserDto })
  @ApiBearerAuthGuard()
  @Get()
  async getProfile(
    @AuthenticatedUser() user: User,
  ): Promise<OrganizationUserDto> {
    return this.userService.getProfile(user);
  }

  @ApiOperation({ summary: 'Get current user organization ID' })
  @ApiOkResponse({ type: String })
  @ApiBearerAuthGuard()
  @Get('organization-id')
  async getOrganizationId(
    @AuthenticatedUser() user: User,
  ): Promise<string> {
    return this.userService.getOrganizationId(user.id);
  }
}
