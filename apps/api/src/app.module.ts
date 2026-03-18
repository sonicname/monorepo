import { getBullMqPrefix, isBullMqEnabled } from '@monorepo/config';
import { getBullMqConnection } from '@monorepo/queue';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
  imports: [...bullMqImports, ProjectsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
