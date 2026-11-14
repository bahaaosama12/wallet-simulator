import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT')),
      secure: true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: this.configService.get<string>('SMTP_USER'),
      to: email,
      subject: 'Email Verification - Digital Wallet',
      text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
    });
  }

  async testConnection() {
    return this.transporter.verify();
  }
}
