import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthGrpcController } from './auth-grpc.controller';
import { DatabaseService } from '../database/database.service';

const mockUser = {
  id: 'user-123',
  email: 'alice@example.com',
  username: 'alice',
  role: 'user',
  displayName: 'Alice Smith',
  avatarUrl: 'https://example.com/avatar.png',
  bio: 'Hello world',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockUsersRepository = {
  findById: jest.fn(),
  update: jest.fn(),
};

const mockDatabaseService = {
  usersRepository: mockUsersRepository,
};

const mockJwtService = {
  verify: jest.fn(),
};

describe('AuthGrpcController', () => {
  let controller: AuthGrpcController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGrpcController],
      providers: [
        { provide: JwtService, useValue: mockJwtService },
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    controller = module.get<AuthGrpcController>(AuthGrpcController);
  });

  describe('verifyToken', () => {
    it('should return valid payload for a valid token', () => {
      mockJwtService.verify.mockReturnValueOnce({
        sub: 'user-123',
        email: 'alice@example.com',
        username: 'alice',
        role: 'admin',
      });

      const result = controller.verifyToken({ token: 'valid.jwt.token' });

      expect(result).toEqual({
        valid: true,
        userId: 'user-123',
        email: 'alice@example.com',
        username: 'alice',
        role: 'admin',
        error: '',
      });
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
    });

    it('should default role to "user" when role is absent from payload', () => {
      mockJwtService.verify.mockReturnValueOnce({
        sub: 'user-123',
        email: 'alice@example.com',
        username: 'alice',
        role: undefined,
      });

      const result = controller.verifyToken({ token: 'valid.jwt.token' });

      expect(result.valid).toBe(true);
      expect(result.role).toBe('user');
    });

    it('should return invalid response with error message for an invalid token', () => {
      mockJwtService.verify.mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });

      const result = controller.verifyToken({ token: 'expired.jwt.token' });

      expect(result).toEqual({
        valid: false,
        userId: '',
        email: '',
        username: '',
        role: '',
        error: 'jwt expired',
      });
    });

    it('should return generic error message for non-Error exceptions', () => {
      mockJwtService.verify.mockImplementationOnce(() => {
        throw 'unexpected string error';
      });

      const result = controller.verifyToken({ token: 'bad.token' });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('getUser', () => {
    it('should return user data when user exists', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(mockUser);

      const result = await controller.getUser({ userId: 'user-123' });

      expect(result).toEqual({
        found: true,
        userId: 'user-123',
        email: 'alice@example.com',
        username: 'alice',
        role: 'user',
      });
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return not-found response when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(undefined);

      const result = await controller.getUser({ userId: 'nonexistent-id' });

      expect(result).toEqual({
        found: false,
        userId: '',
        email: '',
        username: '',
        role: '',
      });
    });
  });

  describe('getProfile', () => {
    it('should return full profile when user exists', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(mockUser);

      const result = await controller.getProfile({ userId: 'user-123' });

      expect(result).toEqual({
        found: true,
        userId: 'user-123',
        email: 'alice@example.com',
        username: 'alice',
        role: 'user',
        displayName: 'Alice Smith',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'Hello world',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return empty profile response when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(undefined);

      const result = await controller.getProfile({ userId: 'nonexistent-id' });

      expect(result).toEqual({
        found: false,
        userId: '',
        email: '',
        username: '',
        role: '',
        displayName: '',
        avatarUrl: '',
        bio: '',
        createdAt: '',
      });
    });

    it('should coerce null optional fields to empty strings', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({
        ...mockUser,
        displayName: null,
        avatarUrl: null,
        bio: null,
      });

      const result = await controller.getProfile({ userId: 'user-123' });

      expect(result.displayName).toBe('');
      expect(result.avatarUrl).toBe('');
      expect(result.bio).toBe('');
    });
  });

  describe('updateProfile', () => {
    it('should return updated profile on success', async () => {
      const updatedUser = { ...mockUser, displayName: 'Alice Updated', bio: 'New bio' };
      mockUsersRepository.update.mockResolvedValueOnce(updatedUser);

      const result = await controller.updateProfile({
        userId: 'user-123',
        displayName: 'Alice Updated',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'New bio',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBe('');
      expect(result.displayName).toBe('Alice Updated');
      expect(result.bio).toBe('New bio');
      expect(mockUsersRepository.update).toHaveBeenCalledWith('user-123', {
        displayName: 'Alice Updated',
        avatarUrl: 'https://example.com/avatar.png',
        bio: 'New bio',
      });
    });

    it('should store null for empty string fields when updating', async () => {
      const updatedUser = { ...mockUser, displayName: null, avatarUrl: null, bio: null };
      mockUsersRepository.update.mockResolvedValueOnce(updatedUser);

      await controller.updateProfile({
        userId: 'user-123',
        displayName: '',
        avatarUrl: '',
        bio: '',
      });

      expect(mockUsersRepository.update).toHaveBeenCalledWith('user-123', {
        displayName: null,
        avatarUrl: null,
        bio: null,
      });
    });

    it('should return failure response when user does not exist', async () => {
      mockUsersRepository.update.mockResolvedValueOnce(undefined);

      const result = await controller.updateProfile({
        userId: 'nonexistent-id',
        displayName: 'Ghost',
        avatarUrl: '',
        bio: '',
      });

      expect(result).toEqual({
        success: false,
        error: 'User not found',
        userId: '',
        email: '',
        username: '',
        role: '',
        displayName: '',
        avatarUrl: '',
        bio: '',
        createdAt: '',
      });
    });
  });
});
