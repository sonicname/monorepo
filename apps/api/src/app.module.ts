import { getBullMqPrefix, isBullMqEnabled } from '@monorepo/config';
import { getBullMqConnection } from '@monorepo/queue';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateAppEnv } from './config/env.validation';
import { ProjectsModule } from './projects/projects.module';

const bullMqEnabled = isBullMqEnabled(process.env);

const bullMqImports = bullMqEnabled
  ? [
      BullModule.forRoot({
        connection: getBullMqConnection(process.env),
        prefix: getBullMqPrefix(process.env),
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateAppEnv,
    }),
    ...bullMqImports,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
