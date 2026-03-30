import { Global, Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RuntimeConfigService } from '../config/runtime-config.service.js';

/**
 * Global MongooseModule that conditionally connects to MongoDB.
 * When MONGO_ENABLED is false (or MONGO_URL is absent), the module
 * registers without a connection — feature modules using Mongoose
 * schemas should guard with RuntimeConfigService.isMongoEnabled().
 */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [RuntimeConfigService],
      useFactory: (config: RuntimeConfigService) => {
        if (!config.isMongoEnabled()) {
          Logger.log('MongoDB disabled — no MONGO_URL set', 'MongoModule');
          return {};
        }

        Logger.log(`MongoDB → ${config.getMaskedMongoUrl()}`, 'MongoModule');
        return { uri: config.getMongoUrl() };
      },
    }),
  ],
})
export class MongoModule {}
