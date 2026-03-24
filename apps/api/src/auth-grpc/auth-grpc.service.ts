import {
  AUTH_GRPC_SERVICE_NAME,
  type GetUserRequest,
  type GetUserResponse,
  type VerifyTokenRequest,
  type VerifyTokenResponse,
} from '@monorepo/proto';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface AuthGrpcClient {
  verifyToken(data: VerifyTokenRequest): Observable<VerifyTokenResponse>;
  getUser(data: GetUserRequest): Observable<GetUserResponse>;
}

@Injectable()
export class AuthGrpcService implements OnModuleInit {
  private authClient!: AuthGrpcClient;

  constructor(
    @Inject(AUTH_GRPC_SERVICE_NAME) private readonly client: object,
  ) {}

  onModuleInit() {
    this.authClient = (this.client as ClientGrpc).getService<AuthGrpcClient>(
      'AuthService',
    );
  }

  verifyToken(token: string): Observable<VerifyTokenResponse> {
    return this.authClient.verifyToken({ token });
  }

  getUser(userId: string): Observable<GetUserResponse> {
    return this.authClient.getUser({ userId });
  }
}
