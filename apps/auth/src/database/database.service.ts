import {
  closeAuthDatabase,
  createAuthDatabase,
  createUsersRepository,
  type AuthDatabaseInstance,
  type UsersRepository,
} from '@monorepo/database/auth';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly instance: AuthDatabaseInstance;
  readonly usersRepository: UsersRepository;

  constructor(runtimeConfigService: RuntimeConfigService) {
    this.instance = createAuthDatabase(
      runtimeConfigService.getDatabaseRuntimeEnv(),
    );
    this.usersRepository = createUsersRepository(this.instance.db);
  }

  async onApplicationShutdown() {
    await closeAuthDatabase(this.instance);
  }
}
