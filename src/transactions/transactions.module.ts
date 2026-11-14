import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './transaction.schema.js';
import { Wallet, WalletSchema } from '../wallets/wallet.schema.js';
import { SecurityModule } from '../security/security.module.js';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    SecurityModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}