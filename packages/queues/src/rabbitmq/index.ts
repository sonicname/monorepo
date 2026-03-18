import {
  getRabbitMqUrl,
  isRabbitMqEnabled,
  type RuntimeEnv,
} from '@monorepo/config';
import {
  PROJECTS_RABBITMQ_EXCHANGE_NAME,
  PROJECTS_RABBITMQ_EXCHANGE_TYPE,
  PROJECTS_RABBITMQ_QUEUE_NAME,
  PROJECTS_RABBITMQ_ROUTING_KEY,
  type ProjectsSyncJobDefinition,
} from '@monorepo/constants';
import {
  connect,
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
  type Options,
} from 'amqplib';

export type RabbitMqConnection = ChannelModel;
export type RabbitMqChannel = Channel;
export type RabbitMqMessage = ConsumeMessage;

export function assertRabbitMqEnabled(env: RuntimeEnv) {
  if (!isRabbitMqEnabled(env)) {
    throw new Error(
      'RabbitMQ is disabled. Set RABBITMQ_URL or RABBITMQ_ENABLED=true to enable it.',
    );
  }
}

export function createRabbitMqConnection(env: RuntimeEnv) {
  assertRabbitMqEnabled(env);

  return connect(getRabbitMqUrl(env));
}

export function createRabbitMqChannel(connection: RabbitMqConnection) {
  return connection.createChannel();
}

export function assertProjectsRabbitMqTopology(channel: RabbitMqChannel) {
  return channel.assertExchange(
    PROJECTS_RABBITMQ_EXCHANGE_NAME,
    PROJECTS_RABBITMQ_EXCHANGE_TYPE,
    {
      durable: true,
    },
  );
}

export function assertRabbitMqQueue(
  channel: RabbitMqChannel,
  queueName: string,
  options?: Options.AssertQueue,
) {
  return channel.assertQueue(queueName, {
    durable: true,
    ...options,
  });
}

export function bindRabbitMqQueue(
  channel: RabbitMqChannel,
  queueName: string,
  exchangeName: string,
  routingKey: string,
) {
  return channel.bindQueue(queueName, exchangeName, routingKey);
}

export async function assertProjectsRabbitMqConsumerTopology(
  channel: RabbitMqChannel,
) {
  await assertProjectsRabbitMqTopology(channel);
  await assertRabbitMqQueue(channel, PROJECTS_RABBITMQ_QUEUE_NAME);
  await bindRabbitMqQueue(
    channel,
    PROJECTS_RABBITMQ_QUEUE_NAME,
    PROJECTS_RABBITMQ_EXCHANGE_NAME,
    PROJECTS_RABBITMQ_ROUTING_KEY,
  );
}

export function publishJsonMessage(
  channel: RabbitMqChannel,
  exchangeName: string,
  routingKey: string,
  payload: unknown,
  options?: Options.Publish,
) {
  return channel.publish(
    exchangeName,
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    {
      contentType: 'application/json',
      persistent: true,
      timestamp: Date.now(),
      ...options,
    },
  );
}

export async function publishProjectsSync(
  env: RuntimeEnv,
  data: ProjectsSyncJobDefinition['data'],
  options?: Options.Publish,
) {
  let connection: RabbitMqConnection | undefined;
  let channel: RabbitMqChannel | undefined;

  try {
    const rabbitMqConnection = await createRabbitMqConnection(env);
    const rabbitMqChannel = await createRabbitMqChannel(rabbitMqConnection);

    connection = rabbitMqConnection;
    channel = rabbitMqChannel;

    await assertProjectsRabbitMqTopology(rabbitMqChannel);

    return publishJsonMessage(
      rabbitMqChannel,
      PROJECTS_RABBITMQ_EXCHANGE_NAME,
      PROJECTS_RABBITMQ_ROUTING_KEY,
      data,
      options,
    );
  } finally {
    if (channel) {
      await channel.close().catch(() => undefined);
    }

    if (connection) {
      await connection.close().catch(() => undefined);
    }
  }
}
