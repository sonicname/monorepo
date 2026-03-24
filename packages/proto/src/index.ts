import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AUTH_GRPC_SERVICE_NAME = 'AuthService';
export const AUTH_GRPC_PACKAGE_NAME = 'auth';

export function getAuthProtoPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '../proto/auth.proto');
}

export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  userId: string;
  email: string;
  username: string;
  error: string;
}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserResponse {
  found: boolean;
  userId: string;
  email: string;
  username: string;
}
