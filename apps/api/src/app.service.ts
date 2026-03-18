import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'api',
      status: 'ok',
      message: 'Nest API is reachable from the SSR app.',
      timestamp: new Date().toISOString(),
    };
  }
}
