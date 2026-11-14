import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction {
  @Prop({
    type: Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  fromWallet: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  toWallet: Types.ObjectId;

  @Prop({
    required: true,
    min: 1,
  })
  amount: number;

  @Prop({
    required: true,
    min: 0,
  })
  fee: number;

  @Prop({
    required: true,
    min: 1,
  })
  totalDeduction: number;

  @Prop({
    required: true,
    enum: ['EGP'],
    default: 'EGP',
  })
  currency: string;

  @Prop({
    required: true,
    enum: ['completed'],
    default: 'completed',
  })
  status: string;

  @Prop({
    required: true,
    trim: true,
  })
  idempotencyKey: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index(
  { fromWallet: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
    },
  },
);