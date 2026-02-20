import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { getTenantId } from '../../common/utils/tenant.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'GESTOR')
  findAll(@Req() request: Request) {
    return this.usersService.findAll(getTenantId(request));
  }

  @Post()
  @Roles('ADMIN')
  create(@Req() request: Request, @Body() dto: CreateUserDto) {
    return this.usersService.create(getTenantId(request), dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(getTenantId(request), id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(getTenantId(request), id, dto);
  }
}
