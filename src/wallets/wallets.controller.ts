import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { WalletsService } from './wallets.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyWallet(@Req() request: any) {
    return this.walletsService.getMyWallet(request.user.sub);
  }
}
