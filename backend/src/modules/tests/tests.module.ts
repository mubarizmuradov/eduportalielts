import { Module } from '@nestjs/common';
import { StorageService } from '../../common/storage.service';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  controllers: [TestsController],
  providers: [TestsService, StorageService],
  exports: [TestsService],
})
export class TestsModule {}
