import { PROJECTS_QUEUE_NAME } from '@monorepo/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueCleanupService } from './queue-cleanup.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: PROJECTS_QUEUE_NAME }),
  ],
  providers: [QueueCleanupService],
})
export class CronModule {}
