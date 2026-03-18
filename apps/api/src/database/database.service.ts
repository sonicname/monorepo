import {
  closeDatabase,
  createDatabase,
  createProjectsRepository,
  type Database,
  type DatabaseInstance,
  type ProjectsRepository,
} from '@monorepo/database';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly instance: DatabaseInstance;
  readonly projectsRepository: ProjectsRepository;

  constructor(runtimeConfigService: RuntimeConfigService) {
    this.instance = createDatabase(
      runtimeConfigService.getDatabaseRuntimeEnv(),
    );
    this.projectsRepository = createProjectsRepository(this.instance.db);
  }

  get db(): Database {
    return this.instance.db;
  }

  async onApplicationShutdown() {
    await closeDatabase(this.instance);
  }
}
