export const PROJECTS_SYNC_JOB_NAME = 'projects.sync';

export type ProjectsSyncJobData = {
  source: 'web' | 'api';
  trigger: 'manual' | 'system';
  requestedAt: string;
};

export type ProjectsSyncJobResult = {
  processedAt: string;
  source: ProjectsSyncJobData['source'];
  trigger: ProjectsSyncJobData['trigger'];
};

export type ProjectsSyncJobDefinition = {
  name: typeof PROJECTS_SYNC_JOB_NAME;
  data: ProjectsSyncJobData;
  result: ProjectsSyncJobResult;
};

export type ProjectsQueueWorkerStatus =
  | 'disabled'
  | 'starting'
  | 'ready'
  | 'processing'
  | 'error';

export type ProjectsQueueStatus = {
  enabled: boolean;
  queueName: string;
  prefix: string;
  redisUrl: string;
  workerStatus: ProjectsQueueWorkerStatus;
  lastJobId: string | null;
  lastProcessedAt: string | null;
};
