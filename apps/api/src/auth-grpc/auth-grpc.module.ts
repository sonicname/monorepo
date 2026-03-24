/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  AUTH_GRPC_PACKAGE_NAME,
  AUTH_GRPC_SERVICE_NAME,
  getAuthProtoPath,
} from '@monorepo/proto';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RuntimeConfigModule } from '../config/runtime-config.module';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { AuthGrpcService } from './auth-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_GRPC_SERVICE_NAME,
        imports: [RuntimeConfigModule],
        inject: [RuntimeConfigService],
        useFactory: (runtimeConfigService: RuntimeConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_GRPC_PACKAGE_NAME,
            protoPath: getAuthProtoPath(),
            url: runtimeConfigService.getAuthGrpcUrl(),
          },
        }),
      },
    ]),
  ],
  providers: [AuthGrpcService],
  exports: [AuthGrpcService],
})
export class AuthGrpcModule {}
