import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { createUserValidation } from './dto/create-user.validation.js';
import { ValidationPipe } from '../validation/validation.pipe.js';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async createUser(
    @Body(new ValidationPipe(createUserValidation)) body: CreateUserDto,
  ) {
    return this.usersService.createUser(body);
  }
}
