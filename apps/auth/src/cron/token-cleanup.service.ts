import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /** Run daily at 3:00 AM — delete revoked/expired refresh tokens and old audit logs. */
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

    try {
      await this.databaseService.verificationTokensRepository.deleteExpired();
      this.logger.log('Expired verification tokens cleaned up');
    } catch (error) {
      this.logger.error(
        `Failed to clean verification tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    try {
      await this.databaseService.auditLogsRepository.deleteOlderThan(90);
      this.logger.log('Audit logs older than 90 days cleaned up');
    } catch (error) {
      this.logger.error(
        `Failed to clean audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
