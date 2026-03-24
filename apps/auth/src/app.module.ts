import { validateRuntimeEnv } from '@monorepo/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { DatabaseModule } from './database/database.module';

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
    AuthModule,
  ],
})
export class AppModule {}
