import {
  getBullMqPrefix,
  getProjectsQueueName,
  getRedisUrl,
  isBullMqEnabled,
  type RuntimeEnv,
} from '@monorepo/config';
import {
  PROJECTS_QUEUE_DEFAULT_JOB_OPTIONS,
  PROJECTS_SYNC_JOB_NAME,
  type ProjectsSyncJobDefinition,
} from '@monorepo/constants';
import {
  Job,
  Queue,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Processor,
} from 'bullmq';

export type ProjectsQueueJob = Job<
  ProjectsSyncJobDefinition['data'],
  ProjectsSyncJobDefinition['result'],
  ProjectsSyncJobDefinition['name']
>;

export type ProjectsQueueWorker = Worker<
  ProjectsSyncJobDefinition['data'],
  ProjectsSyncJobDefinition['result'],
  ProjectsSyncJobDefinition['name']
>;

export function getBullMqConnection(env: RuntimeEnv): ConnectionOptions {
  const redisUrl = new URL(getRedisUrl(env));
  const usesTls = redisUrl.protocol === 'rediss:';
  const dbPath = redisUrl.pathname.replace('/', '');
  const database = dbPath ? Number(dbPath) : undefined;

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || (usesTls ? 6380 : 6379)),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: Number.isInteger(database) ? database : undefined,
    tls: usesTls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

function getSharedQueueOptions(env: RuntimeEnv) {
  return {
    connection: getBullMqConnection(env),
    prefix: getBullMqPrefix(env),
  };
}

export function assertBullMqEnabled(env: RuntimeEnv) {
  if (!isBullMqEnabled(env)) {
    throw new Error(
      'BullMQ is disabled. Set REDIS_URL or BULLMQ_ENABLED=true to enable it.',
    );
  }
}

export function createProjectsQueue(env: RuntimeEnv) {
  assertBullMqEnabled(env);

  return new Queue<
    ProjectsSyncJobDefinition['data'],
    ProjectsSyncJobDefinition['result'],
    ProjectsSyncJobDefinition['name']
  >(getProjectsQueueName(env), {
    ...getSharedQueueOptions(env),
    defaultJobOptions: PROJECTS_QUEUE_DEFAULT_JOB_OPTIONS,
  });
}

export function createProjectsWorker(
  env: RuntimeEnv,
  processor: Processor<
    ProjectsSyncJobDefinition['data'],
    ProjectsSyncJobDefinition['result'],
    ProjectsSyncJobDefinition['name']
  >,
) {
  assertBullMqEnabled(env);

  return new Worker<
    ProjectsSyncJobDefinition['data'],
    ProjectsSyncJobDefinition['result'],
    ProjectsSyncJobDefinition['name']
  >(getProjectsQueueName(env), processor, getSharedQueueOptions(env));
}

export async function enqueueProjectsSync(
  env: RuntimeEnv,
  data: ProjectsSyncJobDefinition['data'],
  options?: JobsOptions,
) {
  const queue = createProjectsQueue(env);

  try {
    return await queue.add(PROJECTS_SYNC_JOB_NAME, data, options);
  } finally {
    await queue.close();
  }
}
