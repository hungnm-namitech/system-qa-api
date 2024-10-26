import { Module } from '@nestjs/common';

import { PasswordHashingModule } from '@/common/modules/hasher/password-hashing.module';
import { MailerModule } from '@/mailer/mailer.module';

import { MeController } from './me.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [MailerModule, PasswordHashingModule],
  controllers: [UserController, MeController],
  providers: [UserService],
})
export class UserModule {}
