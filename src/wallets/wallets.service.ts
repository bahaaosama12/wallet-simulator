import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Wallet, WalletDocument } from './wallet.schema.js';
import type { ClientSession, Model } from 'mongoose';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  async createWallet(
    userId: string,
    phoneNumber: string,
    session: ClientSession,
  ) {
    return this.walletModel.create(
      [{ user: userId, phoneNumber: phoneNumber }],
      { session },
    );
  }

  async getMyWallet(userId: string) {
    return this.walletModel.findOne({ user: userId });
  }
}