import { Module } from '@nestjs/common';
import { StorageService } from '../../common/storage.service';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';

@Module({
  imports: [AssignmentsModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, StorageService],
})
export class AttemptsModule {}
