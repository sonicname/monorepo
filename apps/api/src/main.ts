import { PROJECTS_RABBITMQ_QUEUE_NAME } from '@monorepo/constants';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HttpExceptionEnvelopeFilter } from './common/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'docs'] });

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionEnvelopeFilter());
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Service')
    .setDescription('Main API service — protected by Traefik forwardAuth')
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-User-Id', in: 'header' },
      'X-User-Id',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  if (runtimeConfigService.isRabbitMqEnabled()) {
    await app.startAllMicroservices();
    rabbitMqService.markConnected();
  }

  await app.listen(runtimeConfigService.getApiPort());
}

void bootstrap();
