import { validateRuntimeEnv } from '@monorepo/config';
import { BullModule } from '@nestjs/bullmq';
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { RuntimeConfigService } from './config/runtime-config.service';
import { AuditModule } from './audit/audit.module';
import { AuthGrpcModule } from './auth-grpc/auth-grpc.module';
import { AuthModule } from './auth/auth.module';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { CronModule } from './cron/cron.module';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './email/email.module';
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
    BullModule.forRootAsync({
      inject: [RuntimeConfigService],
      useFactory: (config: RuntimeConfigService) => ({
        connection: config.getBullMqConnection(),
      }),
    }) as never,
    DatabaseModule,
    AuditModule,
    EmailModule,
    AuthModule,
    AuthGrpcModule,
    CronModule,
    HealthModule,
    ThrottleModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
