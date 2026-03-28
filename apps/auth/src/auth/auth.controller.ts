import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: { id: string; email: string; username: string; role: string };
  ip: string;
  headers: Record<string, string | undefined>;
};

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Request() req: AuthenticatedRequest) {
    const result = await this.authService.register(dto);
    void this.auditService.log({
      userId: result.user.id,
      action: 'register',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: AuthenticatedRequest) {
    try {
      const result = await this.authService.login(dto);
      void this.auditService.log({
        userId: result.user.id,
        action: 'login',
        resource: 'auth',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return result;
    } catch (error) {
      void this.auditService.log({
        action: 'login_failed',
        resource: 'auth',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { email: dto.email },
      });
      throw error;
    }
  }

  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto, @Request() req: AuthenticatedRequest) {
    const result = await this.authService.refresh(dto.refreshToken);
    void this.auditService.log({
      userId: result.user.id,
      action: 'refresh_token',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }

  @ApiOperation({ summary: 'Revoke a refresh token (logout)' })
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto, @Request() req: AuthenticatedRequest) {
    await this.authService.logout(dto.refreshToken);
    void this.auditService.log({
      action: 'logout',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: 'Revoke all refresh tokens for current user' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(204)
  async logoutAll(@Request() req: AuthenticatedRequest) {
    await this.authService.logoutAll(req.user.id);
    void this.auditService.log({
      userId: req.user.id,
      action: 'logout_all',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @ApiOperation({ summary: 'Resend email verification' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 3 } })
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@Request() req: AuthenticatedRequest) {
    return this.authService.resendVerificationEmail(req.user.id);
  }

  @ApiOperation({ summary: 'Request password reset email' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Invalid or missing JWT' })
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const result = await this.authService.updateProfile(req.user.id, dto);
    void this.auditService.log({
      userId: req.user.id,
      action: 'profile_update',
      resource: 'auth',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
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
