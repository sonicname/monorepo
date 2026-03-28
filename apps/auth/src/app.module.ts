import { validateRuntimeEnv } from '@monorepo/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthGrpcModule } from './auth-grpc/auth-grpc.module';
import { AuthModule } from './auth/auth.module';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { CronModule } from './cron/cron.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ThrottleModule } from './throttle/throttle.module';

const validateConfig = validateRuntimeEnv as unknown as (
  config: Record<string, unknown>,
) => Record<string, unknown>;

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateConfig,
    }),
    RuntimeConfigModule,
    DatabaseModule,
    AuthModule,
    AuthGrpcModule,
    CronModule,
    HealthModule,
    ThrottleModule,
  ],
})
export class AppModule {}
