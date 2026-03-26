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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: { id: string; email: string; username: string; role: string };
};

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @ApiOperation({ summary: 'Verify JWT for Traefik forwardAuth' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
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
