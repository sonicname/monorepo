import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RuntimeConfigModule } from '../config/runtime-config.module';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { AuthGrpcController } from './auth-grpc.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [RuntimeConfigModule],
      inject: [RuntimeConfigService],
      useFactory: (runtimeConfigService: RuntimeConfigService) => ({
        secret: runtimeConfigService.getJwtSecret(),
      }),
    }),
  ],
  controllers: [AuthGrpcController],
})
export class AuthGrpcModule {}
