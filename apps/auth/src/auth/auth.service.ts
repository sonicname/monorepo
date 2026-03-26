import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

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

    return {
      accessToken: this.signToken(user.id, user.email, user.username, user.role),
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

    return {
      accessToken: this.signToken(user.id, user.email, user.username, user.role),
      user: this.sanitize(user),
    };
  }

  private signToken(id: string, email: string, username: string, role: string): string {
    const payload: JwtPayload = { sub: id, email, username, role };
    return this.jwtService.sign(payload);
  }

  private sanitize(user: {
    id: string;
    email: string;
    username: string;
    role: string;
    createdAt: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
