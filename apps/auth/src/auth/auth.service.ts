import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const [byEmail, byUsername] = await Promise.all([
      this.databaseService.usersRepository.findByEmail(dto.email),
      this.databaseService.usersRepository.findByUsername(dto.username),
    ]);

    if (byEmail) throw new ConflictException('Email is already in use');
    if (byUsername) throw new ConflictException('Username is already in use');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const now = new Date().toISOString();

    const user = await this.databaseService.usersRepository.create({
      id: crypto.randomUUID(),
      email: dto.email,
      username: dto.username,
      passwordHash,
      updatedAt: now,
    });

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken: this.signAccessToken(user.id, user.email, user.username, user.role),
      refreshToken,
      user: this.sanitize(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.databaseService.usersRepository.findByEmail(
      dto.email,
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken: this.signAccessToken(user.id, user.email, user.username, user.role),
      refreshToken,
      user: this.sanitize(user),
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored =
      await this.databaseService.refreshTokensRepository.findByTokenHash(
        tokenHash,
      );

    if (!stored || stored.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date(stored.expiresAt) < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate: revoke old token, issue new pair
    await this.databaseService.refreshTokensRepository.revoke(stored.id);

    const user = await this.databaseService.usersRepository.findById(
      stored.userId,
    );

    if (!user) throw new UnauthorizedException('User not found');

    const newRefreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken: this.signAccessToken(user.id, user.email, user.username, user.role),
      refreshToken: newRefreshToken,
      user: this.sanitize(user),
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored =
      await this.databaseService.refreshTokensRepository.findByTokenHash(
        tokenHash,
      );

    if (stored) {
      await this.databaseService.refreshTokensRepository.revoke(stored.id);
    }
  }

  async logoutAll(userId: string) {
    await this.databaseService.refreshTokensRepository.revokeAllByUserId(
      userId,
    );
  }

  async getProfile(userId: string) {
    const user = await this.databaseService.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.databaseService.usersRepository.update(userId, {
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      bio: dto.bio,
    });

    if (!user) throw new NotFoundException('User not found');

    return this.sanitize(user);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.databaseService.refreshTokensRepository.create({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(
    id: string,
    email: string,
    username: string,
    role: string,
  ): string {
    const payload: JwtPayload = { sub: id, email, username, role };
    return this.jwtService.sign(payload);
  }

  private sanitize(user: {
    id: string;
    email: string;
    username: string;
    role: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }
}
