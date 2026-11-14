import { BadRequestException, Injectable, UnauthorizedException, } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/user.schema.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { JwtService } from '@nestjs/jwt';
import { WalletsService } from '../wallets/wallets.service.js';
import { EmailService } from '../email/email.service.js';
import { randomInt } from 'node:crypto';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectConnection()
    private connection: Connection,
    private jwtService: JwtService,
    private walletsService: WalletsService,
    private emailService: EmailService,
  ) {}

  async login(data: LoginUserDto) {
    const user = await this.userModel
      .findOne({ phoneNumber: data.phoneNumber })
      .select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const payload = {
      sub: user._id.toString(),
      phoneNumber: user.phoneNumber,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
    };
  }

  async sendEmailVerificationOtp(userId: string, email: string) {
    // Generate a 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();

    // Hash the OTP before saving it
    const otpHash = await bcrypt.hash(otp, 10);

    // Set expiration time to 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP data in database
    await this.userModel.findByIdAndUpdate(userId, {
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpiresAt: expiresAt,
      emailVerificationOtpSentAt: new Date(),
      emailVerificationAttempts: 0,
    });

    try {
      await this.emailService.sendOtp(email, otp);
    } catch (error) {
      await this.userModel.findByIdAndUpdate(userId, {
        $unset: {
          emailVerificationOtpHash: 1,
          emailVerificationOtpExpiresAt: 1,
          emailVerificationOtpSentAt: 1,
        },
        $set: {
          emailVerificationAttempts: 0,
        },
      });

      throw error;
    }
  }

  async verifyEmail(data: VerifyEmailDto) {
    const user = await this.userModel
      .findOne({ email: data.email })
      .select(
        '+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationAttempts',
      );

    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP');
    }
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }
    if (
      !user.emailVerificationOtpExpiresAt ||
      user.emailVerificationOtpExpiresAt < new Date()
    ) {
      throw new BadRequestException('OTP has expired');
    }
    if (user.emailVerificationAttempts >= 5) {
      throw new BadRequestException('Too many OTP attempts');
    }

    if (!user.emailVerificationOtpHash) {
      throw new BadRequestException('Invalid OTP');
    }

    const isOtpValid = await bcrypt.compare(
      data.otp,
      user.emailVerificationOtpHash,
    );

    if (!isOtpValid) {
      const updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
          isVerified: false,
          emailVerificationOtpHash: user.emailVerificationOtpHash,
          emailVerificationAttempts: { $lt: 5 },
          emailVerificationOtpExpiresAt: { $gt: new Date() },
        },
        {
          $inc: { emailVerificationAttempts: 1 },
        },
        { new: true },
      );

      if (!updatedUser) {
        const latestUser = await this.userModel
          .findById(user._id)
          .select('+emailVerificationAttempts');

        if (latestUser && latestUser.emailVerificationAttempts >= 5) {
          throw new BadRequestException('Too many OTP attempts');
        }
      }

      throw new BadRequestException('Invalid OTP');
    }

    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const updatedUser = await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
          isVerified: false,
          emailVerificationOtpHash: user.emailVerificationOtpHash,
          emailVerificationOtpExpiresAt: { $gt: new Date() },
          emailVerificationAttempts: { $lt: 5 },
        },
        {
          $set: {
            isVerified: true,
          },
          $unset: {
            emailVerificationOtpHash: 1,
            emailVerificationOtpExpiresAt: 1,
            emailVerificationAttempts: 1,
          },
        },
        {
          session,
          new: true,
        },
      );
      if (!updatedUser) {
        throw new BadRequestException('Email is already verified');
      }

      await this.walletsService.createWallet(
        user._id.toString(),
        user.phoneNumber,
        session,
      );

      await session.commitTransaction();

      return {
        message: 'Email verified successfully. Wallet created.',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async resendOtp(data: ResendOtpDto) {
    const user = await this.userModel
      .findOne({ email: data.email })
      .select('+emailVerificationOtpSentAt');

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.emailVerificationOtpSentAt) {
      const elapsedTime =
        Date.now() - user.emailVerificationOtpSentAt.getTime();

      if (elapsedTime < 60 * 1000) {
        throw new BadRequestException(
          'Please wait before requesting a new OTP',
        );
      }
    }

    const otp = randomInt(100000, 1000000).toString();

    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpiresAt: expiresAt,
      emailVerificationOtpSentAt: new Date(),
      emailVerificationAttempts: 0,
    });

    try {
      await this.emailService.sendOtp(user.email, otp);
    } catch (error) {
      await this.userModel.findOneAndUpdate(
        {
          _id: user._id,
          emailVerificationOtpHash: otpHash,
        },
        {
          $unset: {
            emailVerificationOtpHash: 1,
            emailVerificationOtpExpiresAt: 1,
            emailVerificationOtpSentAt: 1,
          },
          $set: {
            emailVerificationAttempts: 0,
          },
        },
      );

      throw error;
    }
    return {
      message: 'New OTP sent successfully',
    };
  }
}
