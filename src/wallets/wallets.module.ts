import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WalletsController } from './wallets.controller.js';
import { WalletsService } from './wallets.service.js';
import { Wallet, WalletSchema } from './wallet.schema.js';
import { SecurityModule } from '../security/security.module.js';

@Module({
  imports: [
    SecurityModule,
    MongooseModule.forFeature([
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
    ]),
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
