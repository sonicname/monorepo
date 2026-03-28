import { AUTH_GRPC_PACKAGE_NAME, getAuthProtoPath } from '@monorepo/proto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RuntimeConfigService } from './config/runtime-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const runtimeConfigService = app.get(RuntimeConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: AUTH_GRPC_PACKAGE_NAME,
      protoPath: getAuthProtoPath(),
      url: runtimeConfigService.getAuthGrpcBindUrl(),
    },
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'docs'] });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Auth Service')
    .setDescription('Authentication and user management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(runtimeConfigService.getAuthPort());
}

void bootstrap();
