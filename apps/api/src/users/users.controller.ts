import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminOnly } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@AdminOnly()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (Admin only)' })
  @ApiResponse({ status: 200, description: 'All active and inactive users.' })
  @ApiResponse({ status: 403, description: 'ADMIN_ONLY' })
  findAll() {
    return this.users.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created.' })
  @ApiResponse({ status: 409, description: 'EMAIL_IN_USE' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a user name, email, or role (Admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a user (Admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  activate(@Param('id') id: string) {
    return this.users.activate(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a user (Admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 403, description: 'CANNOT_DEACTIVATE_SELF' })
  deactivate(@Param('id') id: string, @CurrentUser() currentUser: AuthUser) {
    return this.users.deactivate(id, currentUser.id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Set a temporary password (Admin only)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto);
  }
}
