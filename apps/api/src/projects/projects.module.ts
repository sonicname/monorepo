import { getProjectsQueueName, isBullMqEnabled } from '@monorepo/config';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ProjectsQueueProcessor } from './projects-queue.processor';
import { ProjectsQueueService } from './projects-queue.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

const bullMqEnabled = isBullMqEnabled(process.env);

const queueImports = bullMqEnabled
  ? [
      BullModule.registerQueue({
        name: getProjectsQueueName(process.env),
      }),
    ]
  : [];

const queueProviders = bullMqEnabled ? [ProjectsQueueProcessor] : [];

@Module({
  imports: [...queueImports],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsQueueService, ...queueProviders],
})
export class ProjectsModule {}
