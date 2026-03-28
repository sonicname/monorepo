import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// -- Error envelope --

class ApiErrorDetail {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: 'Unauthorized' })
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

// -- Profile --

class UserProfileData {
  @ApiProperty({ example: 'uuid-v4' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiProperty({ enum: ['admin', 'user'] })
  role!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bio!: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;
}

export class ApiProfileResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: UserProfileData })
  data!: UserProfileData;
}

// -- Projects --

class ProjectSummaryData {
  @ApiProperty({ example: 'uuid-v4' })
  id!: string;

  @ApiProperty({ example: 'My Project' })
  name!: string;

  @ApiProperty({ example: 'A sample project' })
  summary!: string;

  @ApiProperty({ enum: ['planned', 'in-progress', 'complete'] })
  status!: string;

  @ApiProperty({ example: ['TypeScript', 'NestJS'] })
  stack!: string[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

class ProjectsListData {
  @ApiProperty({ type: [ProjectSummaryData] })
  items!: ProjectSummaryData[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  generatedAt!: string;
}

export class ApiProjectsResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: ProjectsListData })
  data!: ProjectsListData;
}

// -- Queue status --

class QueueStatusData {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 'projects' })
  queueName!: string;

  @ApiProperty({ example: 'monorepo' })
  prefix!: string;

  @ApiProperty({ example: 'redis://***:6379' })
  redisUrl!: string;

  @ApiProperty({ enum: ['disabled', 'starting', 'ready', 'processing', 'error'] })
  workerStatus!: string;
}

export class ApiQueueStatusResponseDto {
  @ApiProperty({ example: true })
  ok!: true;

  @ApiProperty({ type: QueueStatusData })
  data!: QueueStatusData;
}
