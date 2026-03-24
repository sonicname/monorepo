import {
  closeDatabase,
  createDatabase,
  createUsersRepository,
  type DatabaseInstance,
  type UsersRepository,
} from '@monorepo/database';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly instance: DatabaseInstance;
  readonly usersRepository: UsersRepository;

  constructor(runtimeConfigService: RuntimeConfigService) {
    this.instance = createDatabase(
      runtimeConfigService.getDatabaseRuntimeEnv(),
    );
    this.usersRepository = createUsersRepository(this.instance.db);
  }

  async onApplicationShutdown() {
    await closeDatabase(this.instance);
  }
}
