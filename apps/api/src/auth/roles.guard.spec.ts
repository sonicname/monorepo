import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import type { UserRole } from '@monorepo/contracts';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  function makeContext(
    userRole: UserRole | null,
    requiredRoles: UserRole[] | undefined,
    isPublic: boolean | undefined,
  ): ExecutionContext {
    const handler = jest.fn();
    const cls = jest.fn();

    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return requiredRoles;
      return undefined;
    });

    const request = {
      user: userRole
        ? { id: 'u1', email: 'u@x.com', username: 'u1', role: userRole }
        : null,
    };

    return {
      getHandler: jest.fn().mockReturnValue(handler),
      getClass: jest.fn().mockReturnValue(cls),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when route is @Public()', () => {
    it('should return true without checking roles', () => {
      const ctx = makeContext(null, ['admin'], true);

      expect(guard.canActivate(ctx)).toBe(true);
      // switchToHttp should not be called when public
      expect(ctx.switchToHttp).not.toHaveBeenCalled();
    });
  });

  describe('when no @Roles() decorator is set', () => {
    it('should return true when requiredRoles is undefined', () => {
      const ctx = makeContext('user', undefined, undefined);

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when requiredRoles is an empty array', () => {
      const ctx = makeContext('user', [], undefined);

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('when @Roles() decorator is set', () => {
    it('should return true when user role matches required role', () => {
      const ctx = makeContext('admin', ['admin'], undefined);

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should return true when user role is one of multiple required roles', () => {
      const ctx = makeContext('user', ['admin', 'user'], undefined);

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenException when user role does not match', () => {
      const ctx = makeContext('user', ['admin'], undefined);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(ctx)).toThrow('Insufficient permissions');
    });

    it('should throw ForbiddenException when user is null', () => {
      const ctx = makeContext(null, ['admin'], undefined);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  it('should check both IS_PUBLIC_KEY and ROLES_KEY via reflector', () => {
    const ctx = makeContext('user', undefined, undefined);

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
