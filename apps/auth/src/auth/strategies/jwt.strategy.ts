import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RuntimeConfigService } from '../../config/runtime-config.service';

export type JwtPayload = {
  sub: string;
  email: string;
  username: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(runtimeConfigService: RuntimeConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: runtimeConfigService.getJwtSecret(),
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role ?? 'user',
    };
  }
}
