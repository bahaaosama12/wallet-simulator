import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsModule } from '../wallets/wallets.module.js';
import { AuthService } from './auth.service.js';
import { User, UserSchema } from '../users/user.schema.js';
import { AuthController } from './auth.controller.js';
import { SecurityModule } from '../security/security.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    SecurityModule,
    WalletsModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}