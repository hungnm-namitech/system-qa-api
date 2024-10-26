import { ForbiddenException } from '@nestjs/common';

export class PermissionDeniedException extends ForbiddenException {
  constructor() {
    super({
      error: {
        permissionDenied: 'You do not have permission to perform this action.',
      },
    });
  }
}
