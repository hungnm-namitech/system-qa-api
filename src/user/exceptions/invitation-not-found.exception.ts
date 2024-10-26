import { BadRequestException } from '@nestjs/common';

export class InvitationNotFoundException extends BadRequestException {
  constructor() {
    super({
      error: {
        invitationNotFound:
          'The invitation you are looking for does not exist or has already been used.',
      },
    });
  }
}
