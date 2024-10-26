import { BadRequestException } from '@nestjs/common';

export class CreateManualFailException extends BadRequestException {
  constructor() {
    super(
      'An error occurred while creating the manual. Please ensure all required fields are correct and try again.',
    );
  }
}
