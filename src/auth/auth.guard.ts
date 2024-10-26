import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';

import { PrismaService } from '@/common/modules/prisma/prisma.service';

type JwtPayload = { sub: string; email: string };

export const AllowGuest = Reflector.createDecorator<boolean>();

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAllowGuest = this.reflector.get(AllowGuest, context.getHandler());

    const req = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractBearerToken(req);

    if (!isAllowGuest && !accessToken) {
      return false;
    }

    try {
      const decodedAccessToken =
        await this.jwt.verifyAsync<JwtPayload>(accessToken);

      const user = await this.prisma.user.findUnique({
        where: {
          email: decodedAccessToken.email,
        },
      });

      if (user && UserStatus.ACTIVATED) {
        req['user'] = user;

        return true;
      }

      return !!isAllowGuest;
    } catch {
      return !!isAllowGuest;
    }
  }

  private extractBearerToken(req: Request): string {
    const authorizationHeader = req.header('Authorization') || '';

    return (authorizationHeader.split('Bearer')?.[1] || '').trim();
  }
}

export const ApiBearerAuthGuard = () =>
  applyDecorators(
    UseGuards(AuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse(),
  );
