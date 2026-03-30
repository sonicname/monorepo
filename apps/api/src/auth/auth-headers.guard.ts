import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser, UserRole } from '@monorepo/contracts';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class AuthHeadersGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'] as string | undefined;
    const email = request.headers['x-user-email'] as string | undefined;
    const username = request.headers['x-user-username'] as string | undefined;
    const role =
      (request.headers['x-user-role'] as string | undefined) ?? 'user';

    if (!userId || !email || !username) {
      throw new UnauthorizedException('Missing authentication headers');
    }

    const user: AuthUser = {
      id: userId,
      email,
      username,
      role: role as UserRole,
    };
    request.user = user;
    return true;
  }
}
