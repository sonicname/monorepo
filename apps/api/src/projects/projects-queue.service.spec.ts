import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsQueueService } from './projects-queue.service';

// Prevent Jest from parsing runtime-config.service.ts which imports ESM dist of @monorepo/config
jest.mock('../config/runtime-config.service', () => ({
  RuntimeConfigService: class RuntimeConfigService {},
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RuntimeConfigService } = require('../config/runtime-config.service') as {
  RuntimeConfigService: new () => unknown;
};

function makeMockRuntimeConfig(enabled: boolean) {
  return {
    isBullMqEnabled: jest.fn().mockReturnValue(enabled),
    getProjectsQueueName: jest.fn().mockReturnValue('projects'),
    getBullMqPrefix: jest.fn().mockReturnValue('bull'),
    getMaskedBullMqConnectionUrl: jest.fn().mockReturnValue('redis://***:6379'),
  };
}

describe('ProjectsQueueService', () => {
  describe('when BullMQ is enabled', () => {
    let service: ProjectsQueueService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProjectsQueueService,
          {
            provide: RuntimeConfigService,
            useValue: makeMockRuntimeConfig(true),
          },
        ],
      }).compile();

      service = module.get<ProjectsQueueService>(ProjectsQueueService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize status with workerStatus "starting" when enabled', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.workerStatus).toBe('starting');
      expect(status.queueName).toBe('projects');
      expect(status.prefix).toBe('bull');
      expect(status.redisUrl).toBe('redis://***:6379');
      expect(status.lastJobId).toBeNull();
      expect(status.lastProcessedAt).toBeNull();
    });

    it('markReady() should set workerStatus to "ready"', () => {
      service.markReady();

      expect(service.getStatus().workerStatus).toBe('ready');
    });

    it('markProcessing() should set workerStatus to "processing"', () => {
      service.markReady();
      service.markProcessing();

      expect(service.getStatus().workerStatus).toBe('processing');
    });

    it('markCompleted() should set workerStatus to "ready" and record job info', () => {
      service.markProcessing();
      const before = Date.now();
      service.markCompleted('job-42');
      const after = Date.now();

      const status = service.getStatus();
      expect(status.workerStatus).toBe('ready');
      expect(status.lastJobId).toBe('job-42');

      const ts = new Date(status.lastProcessedAt!).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('markCompleted() should accept null jobId', () => {
      service.markCompleted(null);

      const status = service.getStatus();
      expect(status.workerStatus).toBe('ready');
      expect(status.lastJobId).toBeNull();
    });

    it('markFailed() should set workerStatus to "error" and record jobId', () => {
      service.markProcessing();
      service.markFailed('job-99');

      const status = service.getStatus();
      expect(status.workerStatus).toBe('error');
      expect(status.lastJobId).toBe('job-99');
    });

    it('markFailed() with null jobId should retain previous lastJobId', () => {
      service.markCompleted('job-10');
      service.markProcessing();
      service.markFailed(null);

      const status = service.getStatus();
      expect(status.workerStatus).toBe('error');
      expect(status.lastJobId).toBe('job-10');
    });

    it('should support full ready → processing → completed transition', () => {
      service.markReady();
      expect(service.getStatus().workerStatus).toBe('ready');

      service.markProcessing();
      expect(service.getStatus().workerStatus).toBe('processing');

      service.markCompleted('job-1');
      expect(service.getStatus().workerStatus).toBe('ready');
      expect(service.getStatus().lastJobId).toBe('job-1');
    });

    it('should support ready → processing → failed transition', () => {
      service.markReady();
      service.markProcessing();
      service.markFailed('job-2');

      expect(service.getStatus().workerStatus).toBe('error');
      expect(service.getStatus().lastJobId).toBe('job-2');
    });
  });

  describe('when BullMQ is disabled', () => {
    let service: ProjectsQueueService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProjectsQueueService,
          {
            provide: RuntimeConfigService,
            useValue: makeMockRuntimeConfig(false),
          },
        ],
      }).compile();

      service = module.get<ProjectsQueueService>(ProjectsQueueService);
    });

    it('should initialize with workerStatus "disabled" when not enabled', () => {
      const status = service.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.workerStatus).toBe('disabled');
    });

    it('getStatus() should return the same object reference on repeated calls', () => {
      const first = service.getStatus();
      const second = service.getStatus();

      expect(first).toBe(second);
    });
  });
});
