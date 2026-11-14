import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../users/user.schema.js';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({
    required: true,
    unique: true,
  })
  phoneNumber: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    unique: true,
  })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['EGP'], default: 'EGP' })
  currency: string;

  @Prop({ required: true, default: 0, min: 0 })
  balance: number;

  @Prop({
    required: true,
    enum: ['active', 'frozen'],
    default: 'active',
  })
  status: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
