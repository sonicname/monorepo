import { validateRuntimeEnv } from '@monorepo/config';
import { BullModule } from '@nestjs/bullmq';
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { AuthGrpcModule } from './auth-grpc/auth-grpc.module';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { CronModule } from './cron/cron.module';
import { HealthModule } from './health/health.module';
import { ThrottleModule } from './throttle/throttle.module';
import { RuntimeConfigService } from './config/runtime-config.service';
import { DatabaseModule } from './database/database.module';
import { ProfileModule } from './profile/profile.module';
import { ProjectsModule } from './projects/projects.module';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module';

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
    RabbitMqModule,
    BullModule.forRootAsync({
      inject: [RuntimeConfigService],
      useFactory: (runtimeConfigService: RuntimeConfigService) => {
        return {
          connection: runtimeConfigService.getBullMqConnection(),
          prefix: runtimeConfigService.getBullMqPrefix(),
          extraOptions: {
            manualRegistration: !runtimeConfigService.isBullMqEnabled(),
          },
        };
      },
    }) as never,
    ProjectsModule,
    ProfileModule,
    AuthGrpcModule,
    AuthModule,
    CronModule,
    HealthModule,
    ThrottleModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
