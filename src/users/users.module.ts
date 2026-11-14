import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name,
        schema: UserSchema, },
    ]),

    AuthModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
