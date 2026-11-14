import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

import Joi from 'joi';

@Injectable()
export class ValidationPipe implements PipeTransform {
  constructor(private schema: Joi.ObjectSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const { error, value: validatedValue } = this.schema.validate(value);

    if (error) {
      throw new BadRequestException(error.details[0].message);
    }

    return validatedValue;
  }
}
