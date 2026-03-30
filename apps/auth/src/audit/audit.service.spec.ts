import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditEntry } from './audit.service';
import { DatabaseService } from '../database/database.service';

const mockAuditLogsRepository = {
  create: jest.fn(),
};

const mockDatabaseService = {
  auditLogsRepository: mockAuditLogsRepository,
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('should create an audit log entry with all provided fields', async () => {
      const entry: AuditEntry = {
        userId: 'user-123',
        action: 'login',
        resource: '/api/auth/login',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-abc',
        metadata: { deviceId: 'dev-1' },
      };

      mockAuditLogsRepository.create.mockResolvedValueOnce({ id: 'log-1', ...entry });

      await service.log(entry);

      expect(mockAuditLogsRepository.create).toHaveBeenCalledTimes(1);
      const callArg = mockAuditLogsRepository.create.mock.calls[0][0];
      expect(callArg.userId).toBe('user-123');
      expect(callArg.action).toBe('login');
      expect(callArg.resource).toBe('/api/auth/login');
      expect(callArg.ip).toBe('127.0.0.1');
      expect(callArg.userAgent).toBe('Mozilla/5.0');
      expect(callArg.metadata).toMatchObject({ deviceId: 'dev-1', requestId: 'req-abc' });
      expect(typeof callArg.id).toBe('string');
    });

    it('should set userId and ip to null when not provided', async () => {
      const entry: AuditEntry = {
        action: 'register',
        resource: '/api/auth/register',
      };

      mockAuditLogsRepository.create.mockResolvedValueOnce({ id: 'log-2' });

      await service.log(entry);

      const callArg = mockAuditLogsRepository.create.mock.calls[0][0];
      expect(callArg.userId).toBeNull();
      expect(callArg.ip).toBeNull();
      expect(callArg.userAgent).toBeNull();
    });

    it('should not include requestId in metadata when not provided', async () => {
      const entry: AuditEntry = {
        action: 'logout',
        resource: '/api/auth/logout',
        userId: 'user-456',
      };

      mockAuditLogsRepository.create.mockResolvedValueOnce({ id: 'log-3' });

      await service.log(entry);

      const callArg = mockAuditLogsRepository.create.mock.calls[0][0];
      expect(callArg.metadata).not.toHaveProperty('requestId');
    });

    it('should handle DB errors gracefully and not throw', async () => {
      const entry: AuditEntry = {
        action: 'login_failed',
        resource: '/api/auth/login',
      };

      mockAuditLogsRepository.create.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(service.log(entry)).resolves.toBeUndefined();
      expect(mockAuditLogsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should handle non-Error DB exceptions gracefully', async () => {
      const entry: AuditEntry = {
        action: 'profile_update',
        resource: '/api/auth/profile',
        userId: 'user-789',
      };

      mockAuditLogsRepository.create.mockRejectedValueOnce('unexpected failure');

      await expect(service.log(entry)).resolves.toBeUndefined();
    });
  });
});
