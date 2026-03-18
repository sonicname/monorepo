import type {
  ProjectsSyncJobData,
  ProjectsSyncJobResult,
} from '@monorepo/constants';
import type { ProjectsResponse } from '@monorepo/contracts';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getProjects(): Promise<ProjectsResponse> {
    let items = await this.databaseService.projectsRepository.list();

    if (items.length === 0) {
      await this.databaseService.projectsRepository.seedDefaults();
      items = await this.databaseService.projectsRepository.list();
    }

    return {
      generatedAt: new Date().toISOString(),
      items,
    };
  }

  async handleRabbitMqProjectsSync(
    data: ProjectsSyncJobData,
  ): Promise<ProjectsSyncJobResult> {
    let items = await this.databaseService.projectsRepository.list();

    if (items.length === 0) {
      await this.databaseService.projectsRepository.seedDefaults();
      items = await this.databaseService.projectsRepository.list();
    }

    return {
      processedAt: new Date().toISOString(),
      source: data.source,
      trigger: data.trigger,
    };
  }
}
