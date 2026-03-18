import { PROJECTS_QUEUE_NAME } from '@monorepo/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ProjectsQueueProcessor } from './projects-queue.processor';
import { ProjectsQueueService } from './projects-queue.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PROJECTS_QUEUE_NAME,
    }),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsQueueService, ProjectsQueueProcessor],
})
export class ProjectsModule {}
