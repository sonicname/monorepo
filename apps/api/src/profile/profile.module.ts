import { Module } from '@nestjs/common';
import { AuthGrpcModule } from '../auth-grpc/auth-grpc.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [AuthGrpcModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
