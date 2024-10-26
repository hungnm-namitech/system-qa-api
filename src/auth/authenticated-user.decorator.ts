import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const AuthenticatedUser = createParamDecorator<
  string | undefined | null
>((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = request?.['user'] ?? null;

  return data ? user?.[data] ?? null : user;
});
