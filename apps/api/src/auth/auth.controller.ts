import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'JWT access token and current user.',
  })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS' })
  @ApiResponse({ status: 403, description: 'USER_INACTIVE' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current active user.' })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: 403, description: 'USER_INACTIVE' })
  me(@Req() request: Request & { user: { id: string } }) {
    return this.auth.getActiveUser(request.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current user name and email' })
  updateProfile(
    @Req() request: Request & { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(request.user.id, dto.name, dto.email);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change the current user password' })
  changePassword(
    @Req() request: Request & { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      request.user.id,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }
}
