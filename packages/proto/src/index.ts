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
  role: string;
}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserResponse {
  found: boolean;
  userId: string;
  email: string;
  username: string;
  role: string;
}

export interface GetProfileRequest {
  userId: string;
}

export interface GetProfileResponse {
  found: boolean;
  userId: string;
  email: string;
  username: string;
  role: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  userId: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  error: string;
  userId: string;
  email: string;
  username: string;
  role: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
}
