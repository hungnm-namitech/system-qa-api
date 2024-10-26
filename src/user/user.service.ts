import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { customAlphabet } from 'nanoid';
import { lowercase } from 'nanoid-dictionary';

import { PasswordHashingService } from '@/common/modules/hasher/password-hashing.service';
import { PrismaService } from '@/common/modules/prisma/prisma.service';
import { PermissionDeniedException } from '@/common/permission-denied.exception';
import { MailerService } from '@/mailer/mailer.service';

import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ListOrganizationUsersDto } from './dto/list-organization-users.dto';
import { OrganizationUserDto } from './dto/organization-user.dto';
import { RetrieveInvitationSuccessfullyDto } from './dto/retrieve-invitation-successfully.dto';
import { RetrieveUserCountDto } from './dto/retrieve-user-count.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InvitationNotFoundException } from './exceptions/invitation-not-found.exception';
import { OrganizationAdminException } from './exceptions/organization-admin.exception';
import { UserExistsException } from './exceptions/user-exists.exception';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly passwordHashingService: PasswordHashingService,
  ) {}

  async invite(owner: User, email: string): Promise<{ email: string }> {
    await this.ensureInvitationMemberDoesNotExist(email);

    const lowercaseRandomString = customAlphabet(lowercase, 64);
    const token = lowercaseRandomString().toString();

    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: owner.id,
      },
      include: {
        organization: true,
      },
    });

    if (!userOrganization || userOrganization.role !== UserRole.ADMIN) {
      throw new PermissionDeniedException();
    }

    const invitation = await this.prisma.invitation.upsert({
      where: {
        emailAndOrganizationId: {
          email,
          organizationId: userOrganization.organizationId,
        },
      },
      create: {
        email,
        organizationId: userOrganization.organizationId,
        token,
      },
      update: {
        token,
      },
    });

    await this.mailer.sendInviteEmail(invitation.email, invitation.token);

    return { email };
  }

  async retrieveInvitation(
    email: string,
    token: string,
  ): Promise<RetrieveInvitationSuccessfullyDto> {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        email,
        token,
      },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new InvitationNotFoundException();
    }

    return plainToInstance(RetrieveInvitationSuccessfullyDto, {
      email: invitation.email,
      organization: {
        name: invitation.organization.name,
      },
    });
  }

  async acceptInvitation(payload: AcceptInvitationDto): Promise<User> {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        email: payload.email,
        token: payload.token,
      },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new InvitationNotFoundException();
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (user) {
      throw new UserExistsException();
    }

    const [newUser] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          name: payload.name,
          gender: payload?.gender ?? null,
          birthday: payload?.birthday ?? null,
          email: payload.email,
          password: await this.passwordHashingService.hash(payload.password),
          status: UserStatus.ACTIVATED,
          organizations: {
            create: {
              organizationId: invitation.organizationId,
              role: UserRole.MEMBER,
            },
          },
        },
      }),
      this.prisma.invitation.delete({
        where: {
          id: invitation.id,
        },
      }),
    ]);

    return newUser;
  }

  async getUsers(user: User): Promise<ListOrganizationUsersDto> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!userOrganization) {
      return ListOrganizationUsersDto.fromUserOrganizationEntities([]);
    }

    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: {
        organizationId: userOrganization.organizationId,
      },
      orderBy: {
        joinedAt: 'asc',
      },
      include: {
        user: true,
      },
    });

    return ListOrganizationUsersDto.fromUserOrganizationEntities(
      userOrganizations,
    );
  }

  async getUsersCount(owner: User): Promise<RetrieveUserCountDto> {
    const ownerOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: owner.id,
      },
    });

    const total = await this.prisma.userOrganization.count({
      where: {
        organizationId: ownerOrganization.organizationId,
      },
    });

    return plainToInstance(RetrieveUserCountDto, { total });
  }

  async destroyUser(owner: User, id: string): Promise<void> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: owner.id,
      },
    });

    if (!userOrganization || userOrganization.role !== UserRole.ADMIN) {
      throw new PermissionDeniedException();
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return;
    }

    await this.ensureOrganizationHasAdmin(
      userOrganization.organizationId,
      user.id,
    );

    // TODO: confirm specs and fix for remove user from organization or delete user
    await this.prisma.user.delete({
      where: {
        id: user.id,
      },
    });
  }

  async assignRole(owner: User, id: string, role: UserRole): Promise<User> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: owner.id,
      },
    });

    if (!userOrganization || userOrganization.role !== UserRole.ADMIN) {
      throw new PermissionDeniedException();
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return;
    }

    await this.ensureOrganizationHasAdmin(
      userOrganization.organizationId,
      user.id,
    );

    const assignedUserOrganization =
      await this.prisma.userOrganization.findFirst({
        where: {
          userId: user.id,
        },
      });

    if (
      !assignedUserOrganization ||
      assignedUserOrganization.organizationId !==
        userOrganization.organizationId
    ) {
      throw new BadRequestException(`Invalid user or organization.`);
    }

    await this.prisma.userOrganization.update({
      where: {
        id: assignedUserOrganization.id,
      },
      data: {
        role,
      },
    });
  }

  async updateUser(
    owner: User,
    id: string,
    payload: UpdateUserDto,
  ): Promise<OrganizationUserDto> {
    const ownerOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: owner.id,
      },
    });

    if (ownerOrganization.role !== UserRole.ADMIN && owner.id !== id) {
      throw new PermissionDeniedException();
    }

    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: id,
      },
      include: {
        organization: true,
      },
    });

    if (userOrganization.organizationId !== ownerOrganization.organizationId) {
      throw new BadRequestException(``);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id,
        },
        data: {
          name: payload.name,
          birthday: payload.birthday,
          gender: payload.gender,
        },
      }),
      this.prisma.organization.update({
        where: {
          id: userOrganization.organizationId,
        },
        data: {
          name:
            ownerOrganization.role === UserRole.ADMIN
              ? payload.company
              : userOrganization.organization.name,
        },
      }),
    ]);

    const updatedUserOrganization =
      await this.prisma.userOrganization.findFirst({
        where: {
          userId: id,
        },
        include: {
          user: true,
          organization: true,
        },
      });

    return OrganizationUserDto.fromEntity(updatedUserOrganization);
  }

  async getUser(owner: User, id: string): Promise<OrganizationUserDto> {
    const ownerOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: owner.id,
      },
    });

    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: id,
      },
      include: {
        user: true,
        organization: true,
      },
    });

    if (ownerOrganization.organizationId !== userOrganization.organizationId) {
      throw new PermissionDeniedException();
    }

    return OrganizationUserDto.fromEntity(userOrganization);
  }

  async getOrganizationId(userId: string): Promise<string> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: userId,
      },
      include: {
        organization: true,
      },
    });

    if (!userOrganization) {
      throw new NotFoundException(`Organization not found for user with id ${userId}`);
    }

    return userOrganization.organization.id;
}

  async getProfile(user: User): Promise<OrganizationUserDto> {
    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        user: true,
        organization: true,
      },
    });

    return OrganizationUserDto.fromEntity(userOrganization);
  }

  private async ensureInvitationMemberDoesNotExist(
    email: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      throw new UserExistsException(
        `A user with email ${email} already exists.`,
      );
    }
  }

  private async ensureOrganizationHasAdmin(
    organizationId: string,
    ignoredUserId: string,
  ) {
    const adminsCount = await this.prisma.userOrganization.count({
      where: {
        organizationId: organizationId,
        userId: {
          not: {
            equals: ignoredUserId,
          },
        },
        role: UserRole.ADMIN,
      },
    });

    if (adminsCount === 0) {
      throw new OrganizationAdminException();
    }
  }
}
