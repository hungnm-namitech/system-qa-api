import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

import { ValidationException } from '@/common/validation.exception';

@Catch(ValidationException)
export class ValidationErrorFilter extends BaseExceptionFilter {
  private readonly logger: Logger = new Logger(ValidationErrorFilter.name);

  catch(exception: ValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    return res.status(exception.getStatus()).json(exception.getResponse());
  }
}
