import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true, unique: true })
  SSN: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ select: false })
  emailVerificationOtpHash?: string;

  @Prop({ select: false })
  emailVerificationOtpExpiresAt?: Date;

  @Prop({ default: 0, select: false })
  emailVerificationAttempts: number;

  @Prop({ select: false })
  emailVerificationOtpSentAt?: Date;

}

export const UserSchema = SchemaFactory.createForClass(User);
