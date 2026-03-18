import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { RabbitMqController } from './rabbitmq.controller';
import { RabbitMqMessagesController } from './rabbitmq.messages.controller';
import { RabbitMqPublisherService } from './rabbitmq.publisher.service';
import { RabbitMqService } from './rabbitmq.service';

@Module({
  imports: [ProjectsModule],
  controllers: [RabbitMqController, RabbitMqMessagesController],
  providers: [RabbitMqService, RabbitMqPublisherService],
  exports: [RabbitMqService, RabbitMqPublisherService],
})
export class RabbitMqModule {}
