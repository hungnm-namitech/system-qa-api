import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';

import { ValidationException } from '@/common/validation.exception';
import { Env } from '@/env';
import { RootModule } from '@/root.module';
import { ValidationErrorFilter } from '@/validation.error.filter';

(async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(RootModule);
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger('NestExpressApplication');

  app.enableCors({});
  app.useBodyParser('json', { limit: '10mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors) => new ValidationException(errors),
    }),
  );
  app.useGlobalFilters(new ValidationErrorFilter());

  if (config.get('SWAGGER_ENABLED')) {
    app.use(
      '/docs*',
      basicAuth({
        challenge: true,
        users: {
          admin: 'Password@1',
        },
      }),
    );

    SwaggerModule.setup(
      'docs',
      app,
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('SystemQA APIs')
          .setVersion('1.0')
          .addBearerAuth()
          .build(),
      ),
    );
  }

  await app.listen(config.get('PORT'), config.get<string>('HOST'));

  logger.log(`App is running at url ${await app.getUrl()}`);
})();
