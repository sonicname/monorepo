import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import type { ProjectsSyncJobData } from '@monorepo/constants';

// Prevent Jest from parsing database.service.ts which imports ESM dist packages
jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

// Import after mock is registered
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseService } = require('../database/database.service') as {
  DatabaseService: new () => unknown;
};

const mockProject = { id: '1', name: 'Test Project', description: 'Desc' };

const mockProjectsRepository = {
  list: jest.fn(),
  seedDefaults: jest.fn(),
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let databaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: DatabaseService,
          useValue: {
            projectsRepository: mockProjectsRepository,
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    databaseService = module.get(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjects()', () => {
    it('should return projects from DB when items exist', async () => {
      mockProjectsRepository.list.mockResolvedValue([mockProject]);

      const result = await service.getProjects();

      expect(result.items).toEqual([mockProject]);
      expect(result.generatedAt).toBeDefined();
      expect(mockProjectsRepository.seedDefaults).not.toHaveBeenCalled();
    });

    it('should seed defaults and re-fetch when DB is empty', async () => {
      mockProjectsRepository.list
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockProject]);
      mockProjectsRepository.seedDefaults.mockResolvedValue(undefined);

      const result = await service.getProjects();

      expect(mockProjectsRepository.seedDefaults).toHaveBeenCalledTimes(1);
      expect(mockProjectsRepository.list).toHaveBeenCalledTimes(2);
      expect(result.items).toEqual([mockProject]);
    });

    it('should include a generatedAt ISO timestamp', async () => {
      mockProjectsRepository.list.mockResolvedValue([mockProject]);

      const before = Date.now();
      const result = await service.getProjects();
      const after = Date.now();

      const ts = new Date(result.generatedAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('handleRabbitMqProjectsSync()', () => {
    const syncData: ProjectsSyncJobData = {
      source: 'api',
      trigger: 'manual',
      requestedAt: new Date().toISOString(),
    };

    it('should return result with source and trigger from job data', async () => {
      mockProjectsRepository.list.mockResolvedValue([mockProject]);

      const result = await service.handleRabbitMqProjectsSync(syncData);

      expect(result.source).toBe('api');
      expect(result.trigger).toBe('manual');
      expect(result.processedAt).toBeDefined();
    });

    it('should seed defaults when DB is empty before returning result', async () => {
      mockProjectsRepository.list
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockProject]);
      mockProjectsRepository.seedDefaults.mockResolvedValue(undefined);

      await service.handleRabbitMqProjectsSync(syncData);

      expect(mockProjectsRepository.seedDefaults).toHaveBeenCalledTimes(1);
      expect(mockProjectsRepository.list).toHaveBeenCalledTimes(2);
    });

    it('should include a processedAt ISO timestamp', async () => {
      mockProjectsRepository.list.mockResolvedValue([mockProject]);

      const before = Date.now();
      const result = await service.handleRabbitMqProjectsSync(syncData);
      const after = Date.now();

      const ts = new Date(result.processedAt).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('should pass through source and trigger from different job variants', async () => {
      mockProjectsRepository.list.mockResolvedValue([mockProject]);

      const webData: ProjectsSyncJobData = {
        source: 'web',
        trigger: 'system',
        requestedAt: new Date().toISOString(),
      };

      const result = await service.handleRabbitMqProjectsSync(webData);

      expect(result.source).toBe('web');
      expect(result.trigger).toBe('system');
    });
  });
});
