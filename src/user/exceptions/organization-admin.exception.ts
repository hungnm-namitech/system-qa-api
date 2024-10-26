import { BadRequestException } from '@nestjs/common';

export class OrganizationAdminException extends BadRequestException {
  constructor() {
    super({
      error: {
        organizationAdminRequired: 'Organization must have at least one admin.',
      },
    });
  }
}
