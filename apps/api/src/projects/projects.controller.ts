import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ProjectsQueueService } from './projects-queue.service';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@Public()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectsQueueService: ProjectsQueueService,
  ) {}

  @ApiOperation({ summary: 'List all projects' })
  @Get()
  getProjects() {
    return this.projectsService.getProjects();
  }

  @ApiOperation({ summary: 'Get BullMQ queue status' })
  @Get('queue')
  getQueueStatus() {
    return this.projectsQueueService.getStatus();
  }
}
