import {
  getBullMqPrefix,
  getProjectsQueueName,
  getRedisUrl,
  isBullMqEnabled,
  maskConnectionUrl,
} from '@monorepo/config';
import type { ProjectsQueueStatus } from '@monorepo/constants';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectsQueueService {
  private readonly status: ProjectsQueueStatus = {
    enabled: isBullMqEnabled(process.env),
    queueName: getProjectsQueueName(process.env),
    prefix: getBullMqPrefix(process.env),
    redisUrl: maskConnectionUrl(getRedisUrl(process.env)),
    workerStatus: isBullMqEnabled(process.env) ? 'starting' : 'disabled',
    lastJobId: null,
    lastProcessedAt: null,
  };

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
