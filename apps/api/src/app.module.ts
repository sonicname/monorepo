import { validateRuntimeEnv } from '@monorepo/config';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { RuntimeConfigService } from './config/runtime-config.service';
import { DatabaseModule } from './database/database.module';
import { ProjectsModule } from './projects/projects.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
