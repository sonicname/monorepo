import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TokenCleanupService],
})
export class CronModule {}
