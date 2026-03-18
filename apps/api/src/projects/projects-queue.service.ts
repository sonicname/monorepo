import type { ProjectsQueueStatus } from '@monorepo/constants';
import { Injectable } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class ProjectsQueueService {
  private readonly status: ProjectsQueueStatus;

  constructor(runtimeConfigService: RuntimeConfigService) {
    const enabled = runtimeConfigService.isBullMqEnabled();

    this.status = {
      enabled,
      queueName: runtimeConfigService.getProjectsQueueName(),
      prefix: runtimeConfigService.getBullMqPrefix(),
      redisUrl: runtimeConfigService.getMaskedBullMqConnectionUrl(),
      workerStatus: enabled ? 'starting' : 'disabled',
      lastJobId: null,
      lastProcessedAt: null,
    };
  }

  getStatus(): ProjectsQueueStatus {
    return this.status;
  }

  markReady() {
    this.status.workerStatus = 'ready';
  }

  markProcessing() {
    this.status.workerStatus = 'processing';
  }

  markCompleted(jobId: string | null) {
    this.status.workerStatus = 'ready';
    this.status.lastJobId = jobId;
    this.status.lastProcessedAt = new Date().toISOString();
  }

  markFailed(jobId: string | null) {
    this.status.workerStatus = 'error';
    this.status.lastJobId = jobId ?? this.status.lastJobId;
  }
}
