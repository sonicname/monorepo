export type ApiHealth = {
  name: string;
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
};

export type ProjectStatus = 'planned' | 'in-progress' | 'complete';

export type ProjectSummary = {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  stack: string[];
  updatedAt: string;
};

export type ProjectsResponse = {
  items: ProjectSummary[];
  generatedAt: string;
};

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};

export type UserProfile = AuthUser & {
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

export type RabbitMqStatus = {
  enabled: boolean;
  url: string;
  connected: boolean;
  queueName: string;
  pattern: string;
  consumerTag: string | null;
  lastPublishedAt: string | null;
  lastMessageAt: string | null;
  lastError: string | null;
};
