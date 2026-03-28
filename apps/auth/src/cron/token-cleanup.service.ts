import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /** Run daily at 3:00 AM — delete revoked and expired refresh tokens. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    try {
      await this.databaseService.refreshTokensRepository.deleteExpired();
      this.logger.log('Expired refresh tokens cleaned up');
    } catch (error) {
      this.logger.error(
        `Failed to clean expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
