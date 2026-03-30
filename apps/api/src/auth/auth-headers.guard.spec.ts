import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthHeadersGuard } from './auth-headers.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

function buildContext(
  headers: Record<string, string>,
  isPublic: boolean | undefined,
): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  };

  const request = { headers, user: undefined as unknown };

  const ctx = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
    _request: request,
    _reflector: reflector,
  };

  return ctx as unknown as ExecutionContext;
}

describe('AuthHeadersGuard', () => {
  let guard: AuthHeadersGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthHeadersGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthHeadersGuard>(AuthHeadersGuard);
    reflector = module.get(Reflector);
  });

  function makeContext(
    headers: Record<string, string>,
    publicRoute = false,
  ): ExecutionContext {
    reflector.getAllAndOverride.mockReturnValue(publicRoute || undefined);

    const request: Record<string, unknown> = { headers };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when route is @Public()', () => {
    it('should skip validation and return true', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const ctx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn(),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(ctx)).toBe(true);
      expect(ctx.switchToHttp).not.toHaveBeenCalled();
    });
  });

  describe('when all required headers are present', () => {
    it('should return true and attach user to request', () => {
      const ctx = makeContext({
        'x-user-id': 'user-123',
        'x-user-email': 'test@example.com',
        'x-user-username': 'testuser',
      });

      expect(guard.canActivate(ctx)).toBe(true);

      const request = ctx.switchToHttp().getRequest() as Record<
        string,
        unknown
      >;
      expect(request.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
      });
    });

    it('should use x-user-role header when provided', () => {
      const ctx = makeContext({
        'x-user-id': 'admin-456',
        'x-user-email': 'admin@example.com',
        'x-user-username': 'adminuser',
        'x-user-role': 'admin',
      });

      expect(guard.canActivate(ctx)).toBe(true);

      const request = ctx.switchToHttp().getRequest() as Record<
        string,
        unknown
      >;
      expect(request.user).toEqual({
        id: 'admin-456',
        email: 'admin@example.com',
        username: 'adminuser',
        role: 'admin',
      });
    });

    it('should default role to "user" when x-user-role header is absent', () => {
      const ctx = makeContext({
        'x-user-id': 'user-789',
        'x-user-email': 'user@example.com',
        'x-user-username': 'someuser',
      });

      guard.canActivate(ctx);

      const request = ctx.switchToHttp().getRequest() as Record<
        string,
        unknown
      >;
      expect((request.user as { role: string }).role).toBe('user');
    });
  });

  describe('when required headers are missing', () => {
    it('should throw UnauthorizedException when x-user-id is missing', () => {
      const ctx = makeContext({
        'x-user-email': 'test@example.com',
        'x-user-username': 'testuser',
      });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(ctx)).toThrow(
        'Missing authentication headers',
      );
    });

    it('should throw UnauthorizedException when x-user-email is missing', () => {
      const ctx = makeContext({
        'x-user-id': 'user-123',
        'x-user-username': 'testuser',
      });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when x-user-username is missing', () => {
      const ctx = makeContext({
        'x-user-id': 'user-123',
        'x-user-email': 'test@example.com',
      });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when all headers are missing', () => {
      const ctx = makeContext({});

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  it('should check IS_PUBLIC_KEY against handler and class', () => {
    const handler = jest.fn();
    const cls = jest.fn();
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const request = {
      headers: {
        'x-user-id': 'u1',
        'x-user-email': 'u@x.com',
        'x-user-username': 'u1',
      },
    };

    const ctx = {
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(cls),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      cls,
    ]);
  });
});
