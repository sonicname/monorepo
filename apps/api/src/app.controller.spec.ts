import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return the API health payload', () => {
      expect(appController.getHealth()).toMatchObject({
        name: 'api',
        status: 'ok',
        message: 'Nest API is reachable from the SSR app.',
      });

      expect(appController.getHealth().timestamp).toEqual(expect.any(String));
    });
  });
});
