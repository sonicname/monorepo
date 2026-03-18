import { getApiPort, getWebOrigin } from '@monorepo/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: getWebOrigin(process.env),
  });
  await app.listen(getApiPort(process.env));
}
bootstrap();
