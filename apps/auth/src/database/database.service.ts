import {
  closeAuthDatabase,
  createAuthDatabase,
  createRefreshTokensRepository,
  createUsersRepository,
  type AuthDatabaseInstance,
  type RefreshTokensRepository,
  type UsersRepository,
} from '@monorepo/database/auth';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly instance: AuthDatabaseInstance;
  readonly usersRepository: UsersRepository;
  readonly refreshTokensRepository: RefreshTokensRepository;

  constructor(runtimeConfigService: RuntimeConfigService) {
    this.instance = createAuthDatabase(
      runtimeConfigService.getDatabaseRuntimeEnv(),
    );
    this.usersRepository = createUsersRepository(this.instance.db);
    this.refreshTokensRepository = createRefreshTokensRepository(
      this.instance.db,
    );
  }

  async ping(): Promise<void> {
    await this.instance.client`SELECT 1`;
  }

  async onApplicationShutdown() {
    await closeAuthDatabase(this.instance);
  }
}
