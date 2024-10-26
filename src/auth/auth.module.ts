import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PasswordHashingModule } from '@/common/modules/hasher/password-hashing.module';
import { Env } from '@/env';
import { MailerModule } from '@/mailer/mailer.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    MailerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory(config: ConfigService<Env, true>) {
        return {
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES_IN'),
          },
          secret: config.get<string>('JWT_SECRET_KEY'),
        };
      },
    }),
    PasswordHashingModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
