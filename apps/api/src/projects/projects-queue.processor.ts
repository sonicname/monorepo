/* eslint-disable @typescript-eslint/require-await */
import {
  PROJECTS_QUEUE_EVENT_COMPLETED,
  PROJECTS_QUEUE_EVENT_ERROR,
  PROJECTS_QUEUE_EVENT_FAILED,
  PROJECTS_QUEUE_EVENT_READY,
  PROJECTS_QUEUE_NAME,
  type ProjectsSyncJobResult,
} from '@monorepo/constants';
import type { ProjectsQueueJob } from '@monorepo/queues/bullmq';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ProjectsQueueService } from './projects-queue.service';

@Injectable()
@Processor(PROJECTS_QUEUE_NAME)
export class ProjectsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ProjectsQueueProcessor.name);

  constructor(private readonly projectsQueueService: ProjectsQueueService) {
    super();
  }

  async process(job: ProjectsQueueJob): Promise<ProjectsSyncJobResult> {
    this.projectsQueueService.markProcessing();
    this.logger.log(
      `Processing BullMQ job ${job.id} from ${String(job.data.source ?? 'unknown')}.`,
    );

    return {
      processedAt: new Date().toISOString(),
      source: job.data.source,
      trigger: job.data.trigger,
    };
  }

  @OnWorkerEvent(PROJECTS_QUEUE_EVENT_READY)
  onReady() {
    this.projectsQueueService.markReady();
    this.logger.log(`BullMQ worker ready for queue ${PROJECTS_QUEUE_NAME}.`);
  }

  @OnWorkerEvent(PROJECTS_QUEUE_EVENT_COMPLETED)
  onCompleted(job: ProjectsQueueJob) {
    this.projectsQueueService.markCompleted(job.id ? String(job.id) : null);
  }

  @OnWorkerEvent(PROJECTS_QUEUE_EVENT_FAILED)
  onFailed(job: ProjectsQueueJob | undefined, error: Error) {
    this.projectsQueueService.markFailed(job?.id ? String(job.id) : null);
    this.logger.error(`BullMQ job failed: ${error.message}`);
  }

  @OnWorkerEvent(PROJECTS_QUEUE_EVENT_ERROR)
  onError(error: Error) {
    this.projectsQueueService.markFailed(null);
    this.logger.error(`BullMQ worker error: ${error.message}`);
  }
}
