import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { loginUserValidation } from './dto/login-user.validation.js';
import { ValidationPipe } from '../validation/validation.pipe.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { verifyEmailValidation } from './dto/verify-email.validation.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { resendOtpValidation } from './dto/resend-otp.validation.js';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body(new ValidationPipe(loginUserValidation)) data: LoginUserDto) {
    return this.authService.login(data);
  }
  @Post('verify-email')
  verifyEmail(@Body(new ValidationPipe(verifyEmailValidation)) data: VerifyEmailDto) {
    return this.authService.verifyEmail(data);
  }

  @Post('resend-otp')
  resendOtp(@Body(new ValidationPipe(resendOtpValidation)) data: ResendOtpDto) {
    return this.authService.resendOtp(data);
  }
}
