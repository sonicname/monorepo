import { PROJECTS_QUEUE_NAME } from '@monorepo/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

const MAX_COMPLETED_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FAILED_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class QueueCleanupService {
  private readonly logger = new Logger(QueueCleanupService.name);

  constructor(
    @InjectQueue(PROJECTS_QUEUE_NAME)
    private readonly projectsQueue: Queue,
  ) {}

  /** Run daily at 4:00 AM — remove old completed and failed jobs. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCleanup() {
    try {
      const [completed, failed] = await Promise.all([
        this.projectsQueue.clean(MAX_COMPLETED_AGE_MS, 0, 'completed'),
        this.projectsQueue.clean(MAX_FAILED_AGE_MS, 0, 'failed'),
      ]);

      this.logger.log(
        `Queue cleanup done: ${completed.length} completed, ${failed.length} failed jobs removed`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to clean queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
