import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from './token-cleanup.service';
import { DatabaseService } from '../database/database.service';

const mockRefreshTokensRepository = {
  deleteExpired: jest.fn(),
};

const mockVerificationTokensRepository = {
  deleteExpired: jest.fn(),
};

const mockAuditLogsRepository = {
  deleteOlderThan: jest.fn(),
};

const mockDatabaseService = {
  refreshTokensRepository: mockRefreshTokensRepository,
  verificationTokensRepository: mockVerificationTokensRepository,
  auditLogsRepository: mockAuditLogsRepository,
};

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
  });

  describe('handleCleanup', () => {
    it('should delete expired refresh tokens', async () => {
      mockRefreshTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockVerificationTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockAuditLogsRepository.deleteOlderThan.mockResolvedValueOnce(undefined);

      await service.handleCleanup();

      expect(mockRefreshTokensRepository.deleteExpired).toHaveBeenCalledTimes(1);
    });

    it('should delete expired verification tokens', async () => {
      mockRefreshTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockVerificationTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockAuditLogsRepository.deleteOlderThan.mockResolvedValueOnce(undefined);

      await service.handleCleanup();

      expect(mockVerificationTokensRepository.deleteExpired).toHaveBeenCalledTimes(1);
    });

    it('should delete audit logs older than 90 days', async () => {
      mockRefreshTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockVerificationTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockAuditLogsRepository.deleteOlderThan.mockResolvedValueOnce(undefined);

      await service.handleCleanup();

      expect(mockAuditLogsRepository.deleteOlderThan).toHaveBeenCalledWith(90);
    });

    it('should continue and clean verification tokens even when refresh token cleanup fails', async () => {
      mockRefreshTokensRepository.deleteExpired.mockRejectedValueOnce(new Error('refresh token DB error'));
      mockVerificationTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockAuditLogsRepository.deleteOlderThan.mockResolvedValueOnce(undefined);

      await expect(service.handleCleanup()).resolves.toBeUndefined();

      expect(mockVerificationTokensRepository.deleteExpired).toHaveBeenCalledTimes(1);
      expect(mockAuditLogsRepository.deleteOlderThan).toHaveBeenCalledTimes(1);
    });

    it('should continue and clean audit logs even when verification token cleanup fails', async () => {
      mockRefreshTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockVerificationTokensRepository.deleteExpired.mockRejectedValueOnce(new Error('verification token DB error'));
      mockAuditLogsRepository.deleteOlderThan.mockResolvedValueOnce(undefined);

      await expect(service.handleCleanup()).resolves.toBeUndefined();

      expect(mockRefreshTokensRepository.deleteExpired).toHaveBeenCalledTimes(1);
      expect(mockAuditLogsRepository.deleteOlderThan).toHaveBeenCalledTimes(1);
    });

    it('should not throw when audit log cleanup fails', async () => {
      mockRefreshTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockVerificationTokensRepository.deleteExpired.mockResolvedValueOnce(undefined);
      mockAuditLogsRepository.deleteOlderThan.mockRejectedValueOnce(new Error('audit log DB error'));

      await expect(service.handleCleanup()).resolves.toBeUndefined();

      expect(mockRefreshTokensRepository.deleteExpired).toHaveBeenCalledTimes(1);
      expect(mockVerificationTokensRepository.deleteExpired).toHaveBeenCalledTimes(1);
    });

    it('should not throw when all three cleanups fail', async () => {
      mockRefreshTokensRepository.deleteExpired.mockRejectedValueOnce(new Error('error 1'));
      mockVerificationTokensRepository.deleteExpired.mockRejectedValueOnce(new Error('error 2'));
      mockAuditLogsRepository.deleteOlderThan.mockRejectedValueOnce(new Error('error 3'));

      await expect(service.handleCleanup()).resolves.toBeUndefined();
    });
  });
});
