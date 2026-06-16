import { Test, TestingModule } from '@nestjs/testing';
import { FavoresService } from './favores.service';

describe('FavoresService', () => {
  let service: FavoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FavoresService],
    }).compile();

    service = module.get<FavoresService>(FavoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
