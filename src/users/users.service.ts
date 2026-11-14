import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private authService: AuthService,
  ) {}

  async createUser(data: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userModel.create({
      ...data,
      password: hashedPassword,
      isVerified: false,
    });
    await this.authService.sendEmailVerificationOtp(
      user._id.toString(),
      user.email,
    );

    const { password, ...userWithoutPassword } = user.toObject();

    return userWithoutPassword;
  }
}