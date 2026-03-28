import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// -- Error envelope --

class ApiErrorDetail {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: 'Invalid credentials' })
  message!: string;

  @ApiPropertyOptional()
  details?: unknown;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  ok!: false;

  @ApiProperty({ type: ApiErrorDetail })
  error!: ApiErrorDetail;
}

// -- Message response (verify-email, reset-password, etc.) --

class MessageData {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class ApiMessageResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: MessageData })
  data!: MessageData;
}

// -- Auth user --

class AuthUserData {
  @ApiProperty({ example: 'uuid-v4' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiProperty({ enum: ['admin', 'user'], example: 'user' })
  role!: string;
}

class AuthMeResponseData {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: AuthUserData })
  data!: AuthUserData;
}

export { AuthMeResponseData as ApiAuthMeResponseDto };

// -- User profile --

class UserProfileData {
  @ApiProperty({ example: 'uuid-v4' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiProperty({ enum: ['admin', 'user'] })
  role!: string;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ example: 'Software engineer', nullable: true })
  bio!: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;
}

// -- Auth response (login/register/refresh) --

class AuthResponseData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'dGhpcyBpcyBhIHJlZnJl...' })
  refreshToken!: string;

  @ApiProperty({ type: UserProfileData })
  user!: UserProfileData;
}

export class ApiAuthResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: AuthResponseData })
  data!: AuthResponseData;
}

// -- Profile response --

export class ApiProfileResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: UserProfileData })
  data!: UserProfileData;
}
