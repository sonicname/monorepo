import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import {
  ApiProjectsResponseDto,
  ApiQueueStatusResponseDto,
} from '../common/swagger-responses.dto';
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
  @ApiOkResponse({ type: ApiProjectsResponseDto, description: 'Projects list' })
  @Get()
  getProjects() {
    return this.projectsService.getProjects();
  }

  @ApiOperation({ summary: 'Get BullMQ queue status' })
  @ApiOkResponse({ type: ApiQueueStatusResponseDto, description: 'Queue status' })
  @Get('queue')
  getQueueStatus() {
    return this.projectsQueueService.getStatus();
  }
}
