import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RuntimeConfigService } from './config/runtime-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const runtimeConfigService = app.get(RuntimeConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(runtimeConfigService.getAuthPort());
}

void bootstrap();
