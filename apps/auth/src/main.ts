import { AUTH_GRPC_PACKAGE_NAME, getAuthProtoPath } from '@monorepo/proto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
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

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  await app.startAllMicroservices();
  await app.listen(runtimeConfigService.getAuthPort());
}

void bootstrap();
