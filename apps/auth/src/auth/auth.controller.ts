import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: { id: string; email: string; username: string; role: string };
};

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  /**
   * Called by Traefik's forwardAuth middleware before forwarding requests to apps/api.
   * Returns 200 with X-User-* headers on valid JWT, or 401 (via JwtAuthGuard) on failure.
   * Traefik propagates the X-User-* headers to the upstream API service.
   */
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @HttpCode(200)
  verify(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('X-User-Id', req.user.id);
    res.setHeader('X-User-Email', req.user.email);
    res.setHeader('X-User-Username', req.user.username);
    res.setHeader('X-User-Role', req.user.role);
  }
}
