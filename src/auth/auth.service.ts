import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as dayjs from 'dayjs';
import ms from 'ms';
import { customAlphabet } from 'nanoid';
import { lowercase } from 'nanoid-dictionary';

import { PasswordHashingService } from '@/common/modules/hasher/password-hashing.service';
import { PrismaService } from '@/common/modules/prisma/prisma.service';
import { Env } from '@/env';
import { MailerService } from '@/mailer/mailer.service';

import { UserRegisterDto } from './dto/user-register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly mailer: MailerService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(payload: UserRegisterDto) {
    const { email } = payload;

    await this.ensureEmailUnique(email);

    const lowercaseRandomString = customAlphabet(lowercase, 64);
    const emailConfirmationToken = lowercaseRandomString().toString();

    const isPerformUpdate = await this.prisma.user
      .count({
        where: {
          email,
          status: UserStatus.PENDING,
        },
      })
      .then((count) => count > 0)
      .catch(() => false);

    const userOrganization = await this.prisma.userOrganization.findFirst({
      where: {
        user: {
          email,
        },
      },
    });

    const [newUser] = await this.prisma.$transaction([
      this.prisma.user.upsert({
        where: {
          email,
          status: UserStatus.PENDING,
        },
        create: {
          name: payload.name,
          gender: payload?.gender ?? null,
          birthday: payload?.birthday ?? null,
          email,
          password: await this.passwordHashingService.hash(payload.password),
          organizations: {
            create: {
              organization: {
                create: {
                  name: payload.company,
                },
              },
              role: UserRole.ADMIN,
            },
          },
        },
        update: {
          name: payload.name,
          gender: payload?.gender ?? null,
          birthday: payload?.birthday ?? null,
          email,
          password: await this.passwordHashingService.hash(payload.password),
        },
      }),
      this.prisma.registration.create({
        data: {
          email,
          token: emailConfirmationToken,
        },
      }),
      ...(isPerformUpdate && userOrganization.organizationId
        ? [
            this.prisma.organization.update({
              where: {
                id: userOrganization.organizationId,
              },
              data: {
                name: payload.company,
              },
            }),
          ]
        : []),
    ]);

    await this.mailer.sendConfirmationEmail(
      newUser.name,
      newUser.email,
      emailConfirmationToken,
    );

    return { email };
  }

  async confirm(email: string, token: string): Promise<boolean> {
    const registration = await this.prisma.registration.findFirst({
      where: {
        email,
        token,
      },
    });

    if (!registration) {
      throw new BadRequestException({
        error: {
          email: {
            invalidEmailOrToken: `Oops! Something went wrong. It looks like your email or confirmation token isn't valid. Please double-check and try again.`,
          },
        },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!email) {
      throw new BadRequestException({
        error: {
          email: {
            invalidEmailOrToken: `Oops! Something went wrong. It looks like your email or confirmation token isn't valid. Please double-check and try again.`,
          },
        },
      });
    }

    if (this.isTokenExpired(registration.createdAt)) {
      throw new BadRequestException({
        error: {
          email: {
            invalidToken: `Oops! Something went wrong. It looks like your confirmation token isn't valid. Please double-check and try again.`,
          },
        },
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          status: UserStatus.ACTIVATED,
        },
      }),
      this.prisma.registration.delete({
        where: {
          id: registration.id,
        },
      }),
    ]);

    return true;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVATED,
      },
    });

    if (
      !user ||
      !(await this.passwordHashingService.verify(password, user.password))
    ) {
      throw new BadRequestException({
        error: {
          email: {
            invalidCredentials: `Oops! It looks like your email or password is incorrect. Please double-check and try again.`,
          },
        },
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    const expiresIn = Math.floor(
      ms(this.config.get('JWT_EXPIRES_IN', '30d')) / 1000,
    );

    return { accessToken, expiresIn };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVATED,
      },
    });

    if (!user) {
      return;
    }

    const lowercaseRandomString = customAlphabet(lowercase, 64);
    const resetPasswordToken = lowercaseRandomString().toString();
    await this.prisma.passwordReset.upsert({
      where: {
        email,
      },
      create: {
        email,
        token: resetPasswordToken,
      },
      update: {
        token: resetPasswordToken,
      },
    });
    await this.mailer.sendForgotPasswordEmail(
      user.name,
      email,
      resetPasswordToken,
    );
  }

  async resetPassword(
    email: string,
    newPassword: string,
    token: string,
  ): Promise<void> {
    await this.ensureResetPasswordTokenValid(email, token);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          email,
        },
        data: {
          password: await this.passwordHashingService.hash(newPassword),
        },
      }),
      this.prisma.passwordReset.delete({
        where: {
          email,
        },
      }),
    ]);
  }

  private async isEmailExists(email: string): Promise<boolean> {
    return this.prisma.user
      .count({
        where: {
          email,
          status: {
            not: {
              equals: UserStatus.PENDING,
            },
          },
        },
      })
      .then((count) => count > 0)
      .catch(() => true);
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    if (await this.isEmailExists(email)) {
      throw new UnprocessableEntityException({
        error: {
          email: {
            emailAlreadyUsed: `Oops! It looks like this email is already in use. Try logging in or use another email to sign up.`,
          },
        },
      });
    }
  }

  private async ensureEmailIsAllowedToRegister(email: string): Promise<void> {
    const isEmailExists = await this.prisma.emailWhitelist
      .count({
        where: {
          email,
        },
      })
      .then((count) => count > 0)
      .catch(() => false);

    if (!isEmailExists) {
      throw new UnprocessableEntityException({
        error: {
          email: {
            emailNotInvited: `Oops! It looks like your email isn't on our invitation list. Double-check your email or get in touch with us for help.`,
          },
        },
      });
    }
  }

  async ensureResetPasswordTokenValid(
    email: string,
    token: string,
  ): Promise<void> {
    const passwordResetRequest = await this.prisma.passwordReset.findFirst({
      where: {
        email,
        token,
      },
    });

    if (!passwordResetRequest) {
      throw new BadRequestException({
        error: {
          email: {
            invalidEmailOrConfirmationToken: `Oops! It looks like your email is incorrect. Please double-check and try again.`,
          },
        },
      });
    }

    if (this.isTokenExpired(passwordResetRequest.createdAt)) {
      throw new BadRequestException({
        error: {
          email: {
            invalidConfirmationToken: `Oops! Something went wrong. It looks like your email or confirmation token isn't valid. Please double-check and try again.`,
          },
        },
      });
    }
  }

  private isTokenExpired(createdAt: Date): boolean {
    const now = dayjs();
    const tokenCreationTime = dayjs(createdAt);
    const timeDifferenceInSeconds = now.unix() - tokenCreationTime.unix();
    const tokenLifeTimeInHours = 24;
    const tokenLifeTimeInSeconds = tokenLifeTimeInHours * 60 * 60;

    return timeDifferenceInSeconds > tokenLifeTimeInSeconds;
  }
}
