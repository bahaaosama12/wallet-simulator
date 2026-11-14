import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { TransferDto } from './dto/transfer.dto.js';
import { transferValidation } from './dto/transfer.validation.js';
import { ValidationPipe } from '../validation/validation.pipe.js';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    phoneNumber: string;
  };
};

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  transfer(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe(transferValidation))
    body: TransferDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.transactionsService.transfer(
      req.user.sub,
      body,
      idempotencyKey,
    );
  }
}
