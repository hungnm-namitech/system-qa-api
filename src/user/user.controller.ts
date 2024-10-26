import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';

import { ApiBearerAuthGuard } from '@/auth/auth.guard';
import { AuthenticatedUser } from '@/auth/authenticated-user.decorator';
import { OrganizationUserDto } from '@/user/dto/organization-user.dto';
import { UpdateUserDto } from '@/user/dto/update-user.dto';

import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AcceptInvitationSuccessfullyDto } from './dto/accept-invitation-successfully.dto';
import { AssignRoleToUserDto } from './dto/assign-role-to-user.dto';
import { ListOrganizationUsersDto } from './dto/list-organization-users.dto';
import { MemberInvitationDto } from './dto/member-invitation.dto';
import { RetrieveInvitationSuccessfullyDto } from './dto/retrieve-invitation-successfully.dto';
import { RetrieveUserCountDto } from './dto/retrieve-user-count.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('api/users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Invite a member to the platform' })
  @ApiOkResponse({ description: 'Invitation sent successfully' })
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    description: 'Invalid email or user already exists',
  })
  @ApiBearerAuthGuard()
  @HttpCode(HttpStatus.OK)
  @Post('invite')
  async invite(
    @AuthenticatedUser() user: User,
    @Body() { email }: MemberInvitationDto,
  ) {
    await this.userService.invite(user, email);

    return { status: 'OK' };
  }

  @ApiOperation({ summary: 'Retrieve an invitation by token' })
  @ApiOkResponse({
    description: 'Successfully retrieved the invitation',
    type: RetrieveInvitationSuccessfullyDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid token or invitation not found',
  })
  @Get('invitations/:token')
  async getInvitation(
    @Param('token') token: string,
    @Query('email') email: string | undefined,
  ): Promise<RetrieveInvitationSuccessfullyDto> {
    return this.userService.retrieveInvitation(email || '', token);
  }

  @ApiOperation({ summary: 'Accept invitation to join organization' })
  @ApiOkResponse({ type: AcceptInvitationSuccessfullyDto })
  @ApiBadRequestResponse()
  @HttpCode(HttpStatus.OK)
  @Post('invite/accept')
  async acceptInvitation(
    @Body() payload: AcceptInvitationDto,
  ): Promise<AcceptInvitationSuccessfullyDto> {
    const newUser = await this.userService.acceptInvitation(payload);

    return new AcceptInvitationSuccessfullyDto(
      newUser.email,
      newUser.name,
      newUser.gender,
      newUser.birthday,
    );
  }

  @ApiOperation({ summary: 'Get organization users' })
  @ApiOkResponse({ type: ListOrganizationUsersDto })
  @ApiBearerAuthGuard()
  @Get()
  async getUsers(
    @AuthenticatedUser() user: User,
  ): Promise<ListOrganizationUsersDto> {
    return this.userService.getUsers(user);
  }

  @ApiOperation({ summary: 'Get users count' })
  @ApiOkResponse({ type: RetrieveUserCountDto })
  @ApiBearerAuthGuard()
  @Get('count')
  async getUserCount(@AuthenticatedUser() owner: User) {
    return this.userService.getUsersCount(owner);
  }

  @ApiOperation({ summary: 'Delete user account' })
  @ApiOkResponse()
  @ApiBearerAuthGuard()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async destroyUser(
    @AuthenticatedUser() owner: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.userService.destroyUser(owner, id);
  }

  @ApiOperation({ summary: 'Assign role to user' })
  @ApiOkResponse()
  @ApiBearerAuthGuard()
  @HttpCode(HttpStatus.OK)
  @Post(':id/roles/assign')
  async assignRole(
    @AuthenticatedUser() owner: User,
    @Param('id') id: string,
    @Body() { role }: AssignRoleToUserDto,
  ) {
    await this.userService.assignRole(owner, id, role);

    return { status: 'OK' };
  }

  @ApiOperation({ summary: 'Get user information' })
  @ApiOkResponse({ type: OrganizationUserDto })
  @ApiBearerAuthGuard()
  @Get(':id')
  async getUser(
    @AuthenticatedUser() owner: User,
    @Param('id') id: string,
  ): Promise<OrganizationUserDto> {
    return this.userService.getUser(owner, id);
  }

  @ApiOperation({ summary: 'Update user information' })
  @ApiOkResponse({ type: OrganizationUserDto })
  @ApiBearerAuthGuard()
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  async updateUser(
    @AuthenticatedUser() owner: User,
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
  ): Promise<OrganizationUserDto> {
    return this.userService.updateUser(owner, id, payload);
  }
}
