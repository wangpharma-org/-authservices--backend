import {
  Body,
  Controller,
  Post,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../../users/domain/user.entity';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiCreatedResponse({ type: LoginResponseDto })
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @ApiOkResponse({ type: LoginResponseDto })
  @Post('login')
  login(@Body() loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    return this.authService.validateLogin(loginDto);
  }

  @ApiOkResponse({ description: 'Logged out successfully' })
  @Post('logout')
  logout(@Req() req: Request): Promise<void> {
    const userId = (req['user'] as { id: string }).id;
    return this.authService.logout(userId);
  }

  @Public()
  @ApiOkResponse({ type: LoginResponseDto })
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string): Promise<{ accessToken: LoginResponseDto['accessToken'] }> {
    return this.authService.refresh(refreshToken);
  }
}
