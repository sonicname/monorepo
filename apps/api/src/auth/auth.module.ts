import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthHeadersGuard } from './auth-headers.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthHeadersGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
