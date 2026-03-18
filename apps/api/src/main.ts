import { PROJECTS_RABBITMQ_QUEUE_NAME } from '@monorepo/constants';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { RuntimeConfigService } from './config/runtime-config.service';
import { RabbitMqService } from './rabbitmq/rabbitmq.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const runtimeConfigService = app.get(RuntimeConfigService);
  const rabbitMqService = app.get(RabbitMqService);

  if (runtimeConfigService.isRabbitMqEnabled()) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [runtimeConfigService.getRabbitMqUrl()],
        queue: PROJECTS_RABBITMQ_QUEUE_NAME,
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 1,
      },
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: runtimeConfigService.getWebOrigin(),
  });

  if (runtimeConfigService.isRabbitMqEnabled()) {
    await app.startAllMicroservices();
    rabbitMqService.markConnected();
  }

  await app.listen(runtimeConfigService.getApiPort());
}

void bootstrap();
