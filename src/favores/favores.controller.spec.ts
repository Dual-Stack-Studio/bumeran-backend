import { Test, TestingModule } from '@nestjs/testing';
import { FavoresController } from './favores.controller';

describe('FavoresController', () => {
  let controller: FavoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoresController],
    }).compile();

    controller = module.get<FavoresController>(FavoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
