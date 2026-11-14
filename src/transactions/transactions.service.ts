import { BadRequestException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { ClientSession, Connection, Model } from 'mongoose';import { Transaction } from './transaction.schema.js';
import { Wallet, WalletDocument } from '../wallets/wallet.schema.js';
import { TransferDto } from './dto/transfer.dto.js';
import { addDays, parseISO, startOfMonth, addMonths } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,
    @InjectConnection()
    private connection: Connection,
  ) {}

  async transfer(userId: string, data: TransferDto, idempotencyKey: string) {

    const existingSenderWallet = await this.walletModel.findOne({
      user: userId,
    });

    if (!existingSenderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    const existingTransaction = await this.transactionModel.findOne({
      fromWallet: existingSenderWallet._id,
      idempotencyKey,
    });

    if (existingTransaction) {
      return {
        message: 'Transfer already processed',
        transaction: existingTransaction,
      };
    }
    const session = await this.connection.startSession();

    try {
      await session.startTransaction();

      const receiverWallet = await this.walletModel
        .findOne({
          phoneNumber: data.receiverPhoneNumber,
        })
        .session(session);

      if (!receiverWallet) {
        throw new NotFoundException('Receiver wallet not found');
      }
      const senderWallet = await this.walletModel
        .findOne({
          user: userId,
        })
        .session(session);

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }
      if (senderWallet._id.equals(receiverWallet._id)) {
        throw new BadRequestException('You cannot transfer money to yourself');
      }
      if (
        senderWallet.status !== 'active' ||
        receiverWallet.status !== 'active'
      ) {
        throw new BadRequestException('One of the wallets is not active');
      }
      const fee = Math.min(data.amount * 0.001, 20);

      const totalDeduction = data.amount + fee;

      if (senderWallet.balance < totalDeduction) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      const dailyTotal = await this.getDailyOutgoingTotal(
        senderWallet._id.toString(),
        session,
      );
      if (dailyTotal + totalDeduction > 120000) {
        throw new BadRequestException('Daily transfer limit exceeded');
      }
      const monthlyTotal = await this.getMonthlyOutgoingTotal(
        senderWallet._id.toString(),
        session,
      );

      if (monthlyTotal + totalDeduction > 200000) {
        throw new BadRequestException('Monthly transfer limit exceeded');
      }

      const updatedSenderWallet = await this.walletModel.findOneAndUpdate(
        {
          _id: senderWallet._id,
          balance: { $gte: totalDeduction },
          status: 'active',
        },
        {
          $inc: { balance: -totalDeduction },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedSenderWallet) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      const updatedReceiverWallet = await this.walletModel.findOneAndUpdate(
        {
          _id: receiverWallet._id,
          status: 'active',
        },
        {
          $inc: { balance: data.amount },
        },
        {
          new: true,
          session,
        },
      );

      if (!updatedReceiverWallet) {
        throw new BadRequestException('Receiver wallet is not active');
      }

      const transaction = new this.transactionModel({
        fromWallet: senderWallet._id,
        toWallet: receiverWallet._id,
        amount: data.amount,
        fee,
        totalDeduction,
        currency: 'EGP',
        status: 'completed',
        idempotencyKey,
      });
      await transaction.save({ session });

      await session.commitTransaction();
      return {
        message: 'Transfer completed successfully',
        transaction,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      const mongoError = error as { code?: number };

      if (mongoError.code === 11000) {
        const senderWallet = await this.walletModel.findOne({
          user: userId,
        });

        if (senderWallet) {
          const existingTransaction = await this.transactionModel.findOne({
            fromWallet: senderWallet._id,
            idempotencyKey,
          });

          if (existingTransaction) {
            return {
              message: 'Transfer already processed',
              transaction: existingTransaction,
            };
          }
        }
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async getDailyOutgoingTotal(
    walletId: string,
    session: ClientSession,
  ): Promise<number> {
    const timeZone = 'Africa/Cairo';

    const now = new Date();

    const egyptDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

    const startOfDayLocal = parseISO(`${egyptDate}T00:00:00`);

    const startOfTomorrowLocal = addDays(startOfDayLocal, 1);

    const startOfDay = fromZonedTime(startOfDayLocal, timeZone);

    const startOfTomorrow = fromZonedTime(startOfTomorrowLocal, timeZone);

    const result = await this.transactionModel
      .aggregate([
        {
          $match: {
            fromWallet: new Types.ObjectId(walletId),
            status: 'completed',
            createdAt: {
              $gte: startOfDay,
              $lt: startOfTomorrow,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$totalDeduction',
            },
          },
        },
      ])
      .session(session);

    return result[0]?.total ?? 0;
  }

  private async getMonthlyOutgoingTotal(
    walletId: string,
    session: ClientSession,
  ): Promise<number> {
    const timeZone = 'Africa/Cairo';

    const now = new Date();

    const egyptDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');

    const currentMonth = startOfMonth(parseISO(`${egyptDate}T00:00:00`));

    const nextMonth = addMonths(currentMonth, 1);

    const startOfMonthDate = fromZonedTime(currentMonth, timeZone);

    const startOfNextMonth = fromZonedTime(nextMonth, timeZone);

    const result = await this.transactionModel
      .aggregate([
        {
          $match: {
            fromWallet: new Types.ObjectId(walletId),
            status: 'completed',
            createdAt: {
              $gte: startOfMonthDate,
              $lt: startOfNextMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$totalDeduction',
            },
          },
        },
      ])
      .session(session);

    return result[0]?.total ?? 0;
  }
}

