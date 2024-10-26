import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from '@/app.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/common/modules/prisma/prisma.module';
import { EnvSchema } from '@/env';
import { ManualModule } from '@/manual/manual.module';
import { UserModule } from '@/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: EnvSchema.parse,
    }),
    PrismaModule,

    AuthModule,
    UserModule,
    ManualModule,
  ],
  controllers: [AppController],
})
export class RootModule {}
