import { BadRequestException } from '@nestjs/common';

export class UserExistsException extends BadRequestException {
  constructor(message = 'A user with this email already exists.') {
    super({
      error: {
        userExists: message,
      },
    });
  }
}
