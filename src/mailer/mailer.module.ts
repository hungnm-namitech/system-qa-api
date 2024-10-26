import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

import { Env } from '@/env';

import { EMAIL_TRANSPORTER } from './mailer.const';
import { MailerService } from './mailer.service';

@Module({
  providers: [
    MailerService,
    {
      provide: EMAIL_TRANSPORTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        const mailer = config.get('MAIL_TRANSPORTER');

        switch (mailer) {
          default:
            return createTransport({
              host: config.get('MAIL_SMTP_HOST'),
              port: config.get('MAIL_SMTP_PORT'),
              auth: {
                user: config.get('MAIL_SMTP_USERNAME'),
                pass: config.get('MAIL_SMTP_PASSWORD'),
              },
              tls: {
                rejectUnauthorized: true,
              },
            });
        }
      },
    },
  ],
  exports: [MailerService],
})
export class MailerModule {}
