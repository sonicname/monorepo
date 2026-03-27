import {
  AUTH_GRPC_SERVICE_NAME,
  type GetProfileRequest,
  type GetProfileResponse,
  type GetUserRequest,
  type GetUserResponse,
  type UpdateProfileRequest,
  type UpdateProfileResponse,
  type VerifyTokenRequest,
  type VerifyTokenResponse,
} from '@monorepo/proto';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

const EMPTY_PROFILE_RESPONSE: GetProfileResponse = {
  found: false,
  userId: '',
  email: '',
  username: '',
  role: '',
  displayName: '',
  avatarUrl: '',
  bio: '',
  createdAt: '',
};

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  @GrpcMethod(AUTH_GRPC_SERVICE_NAME, 'VerifyToken')
  verifyToken(data: VerifyTokenRequest): VerifyTokenResponse {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        username: string;
        role: string;
      }>(data.token);

      return {
        valid: true,
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        error: '',
        role: payload.role ?? 'user',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      return { valid: false, userId: '', email: '', username: '', error: message, role: '' };
    }
  }

  @GrpcMethod(AUTH_GRPC_SERVICE_NAME, 'GetUser')
  async getUser(data: GetUserRequest): Promise<GetUserResponse> {
    const user = await this.databaseService.usersRepository.findById(data.userId);

    if (!user) {
      return { found: false, userId: '', email: '', username: '', role: '' };
    }

    return { found: true, userId: user.id, email: user.email, username: user.username, role: user.role };
  }

  @GrpcMethod(AUTH_GRPC_SERVICE_NAME, 'GetProfile')
  async getProfile(data: GetProfileRequest): Promise<GetProfileResponse> {
    const user = await this.databaseService.usersRepository.findById(data.userId);

    if (!user) {
      return EMPTY_PROFILE_RESPONSE;
    }

    return {
      found: true,
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName ?? '',
      avatarUrl: user.avatarUrl ?? '',
      bio: user.bio ?? '',
      createdAt: user.createdAt,
    };
  }

  @GrpcMethod(AUTH_GRPC_SERVICE_NAME, 'UpdateProfile')
  async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    const user = await this.databaseService.usersRepository.update(data.userId, {
      displayName: data.displayName || null,
      avatarUrl: data.avatarUrl || null,
      bio: data.bio || null,
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        userId: '',
        email: '',
        username: '',
        role: '',
        displayName: '',
        avatarUrl: '',
        bio: '',
        createdAt: '',
      };
    }

    return {
      success: true,
      error: '',
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      displayName: user.displayName ?? '',
      avatarUrl: user.avatarUrl ?? '',
      bio: user.bio ?? '',
      createdAt: user.createdAt,
    };
  }
}
