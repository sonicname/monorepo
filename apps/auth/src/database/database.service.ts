import {
  closeAuthDatabase,
  createAuditLogsRepository,
  createAuthDatabase,
  createRefreshTokensRepository,
  createUsersRepository,
  createVerificationTokensRepository,
  type AuditLogsRepository,
  type AuthDatabaseInstance,
  type RefreshTokensRepository,
  type UsersRepository,
  type VerificationTokensRepository,
} from '@monorepo/database/auth';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly instance: AuthDatabaseInstance;
  readonly usersRepository: UsersRepository;
  readonly refreshTokensRepository: RefreshTokensRepository;
  readonly auditLogsRepository: AuditLogsRepository;
  readonly verificationTokensRepository: VerificationTokensRepository;

  constructor(runtimeConfigService: RuntimeConfigService) {
    this.instance = createAuthDatabase(
      runtimeConfigService.getDatabaseRuntimeEnv(),
    );
    this.usersRepository = createUsersRepository(this.instance.db);
    this.refreshTokensRepository = createRefreshTokensRepository(
      this.instance.db,
    );
    this.auditLogsRepository = createAuditLogsRepository(this.instance.db);
    this.verificationTokensRepository =
      createVerificationTokensRepository(this.instance.db);
  }

  async ping(): Promise<void> {
    await this.instance.client`SELECT 1`;
  }

  async onApplicationShutdown() {
    await closeAuthDatabase(this.instance);
  }
}
