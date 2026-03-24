/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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

  async onApplicationShutdown() {
    await closeApiDatabase(this.instance);
  }
}
