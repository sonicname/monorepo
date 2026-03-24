import {
  AUTH_GRPC_SERVICE_NAME,
  type GetUserRequest,
  type GetUserResponse,
  type VerifyTokenRequest,
  type VerifyTokenResponse,
} from '@monorepo/proto';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

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
      }>(data.token);

      return {
        valid: true,
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        error: '',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      return { valid: false, userId: '', email: '', username: '', error: message };
    }
  }

  @GrpcMethod(AUTH_GRPC_SERVICE_NAME, 'GetUser')
  async getUser(data: GetUserRequest): Promise<GetUserResponse> {
    const user = await this.databaseService.usersRepository.findById(data.userId);

    if (!user) {
      return { found: false, userId: '', email: '', username: '' };
    }

    return { found: true, userId: user.id, email: user.email, username: user.username };
  }
}
