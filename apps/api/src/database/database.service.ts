import {
  closeApiDatabase,
  createApiDatabase,
  createProjectsRepository,
  type ApiDatabase,
  type ApiDatabaseInstance,
  type ProjectsRepository,
} from '@monorepo/database/api';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly instance: ApiDatabaseInstance;
  readonly projectsRepository: ProjectsRepository;

  constructor(runtimeConfigService: RuntimeConfigService) {
    this.instance = createApiDatabase(
      runtimeConfigService.getDatabaseRuntimeEnv(),
    );
    this.projectsRepository = createProjectsRepository(this.instance.db);
  }

  get db(): ApiDatabase {
    return this.instance.db;
  }

  async ping(): Promise<void> {
    await this.instance.client`SELECT 1`;
  }

  async onApplicationShutdown() {
    await closeApiDatabase(this.instance);
  }
}
