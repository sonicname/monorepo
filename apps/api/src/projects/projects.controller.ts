import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ProjectsQueueService } from './projects-queue.service';
import { ProjectsService } from './projects.service';

@Public()
@Controller('api/projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectsQueueService: ProjectsQueueService,
  ) {}

  @Get()
  getProjects() {
    return this.projectsService.getProjects();
  }

  @Get('queue')
  getQueueStatus() {
    return this.projectsQueueService.getStatus();
  }
}
