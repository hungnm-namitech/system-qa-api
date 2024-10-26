import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(public readonly errors: ValidationError[]) {
    super('Unprocessable Entity', HttpStatus.UNPROCESSABLE_ENTITY);
  }

  getResponse() {
    return {
      error: this.errors.reduce((errors, { property: field, constraints }) => {
        return {
          ...errors,
          [field]: Object.keys(constraints).reduce((fieldErrors, error) => {
            return {
              ...fieldErrors,
              [error]: constraints[error],
            };
          }, {}),
        };
      }, {}),
    };
  }
}
