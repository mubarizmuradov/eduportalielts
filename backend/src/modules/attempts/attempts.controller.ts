import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { parse } from '../../common/zod';
import { CurrentUser } from '../auth/auth.guard';
import type { EduUser } from '../identity/identity.types';
import { AttemptsService } from './attempts.service';

const band = z.number().int().min(0).max(9);
const writingCriteria = z.object({ ta: band, cc: band, lr: band, gra: band });
const gradeBody = z
  .object({
    writing: z
      .object({ task1: writingCriteria, task2: writingCriteria, comment: z.string().trim().max(5000).optional() })
      .optional(),
    speaking: z
      .object({ fc: band, lr: band, gra: band, p: band, comment: z.string().trim().max(5000).optional() })
      .optional(),
  })
  .refine((b) => b.writing || b.speaking, 'nothing to grade');
const answersBody = z.object({
  module: z.enum(['listening', 'reading']),
  answers: z.record(z.string(), z.unknown()),
});
const writingBody = z.object({ task1: z.string().max(20000), task2: z.string().max(20000) });
const finishBody = z.object({ module: z.enum(['listening', 'reading', 'writing', 'speaking']) });
const slotQuery = z.object({
  part: z.coerce.number().int().min(1).max(3),
  index: z.coerce.number().int().min(0).max(30),
  durationMs: z.coerce.number().int().min(0).max(600_000).optional(),
});

@Controller()
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  /** Student starts or resumes the test of an assignment. */
  @Post('assignments/:id/start')
  @HttpCode(200)
  start(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.attempts.start(user, id);
  }

  @Get('attempts/:id/state')
  state(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.attempts.state(user, id);
  }

  @Put('attempts/:id/answers')
  answers(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const b = parse(answersBody, body);
    return this.attempts.saveAnswers(user, id, b.module === 'listening' ? 'LISTENING' : 'READING', b.answers);
  }

  @Put('attempts/:id/writing')
  writing(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.attempts.saveWriting(user, id, parse(writingBody, body));
  }

  @Post('attempts/:id/finish-module')
  @HttpCode(200)
  finish(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const m = parse(finishBody, body).module;
    return this.attempts.finishModule(user, id, m.toUpperCase() as 'LISTENING');
  }

  @Post('attempts/:id/recordings')
  @UseInterceptors(FileInterceptor('audio', { storage: memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } }))
  record(
    @CurrentUser() user: EduUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const q = parse(slotQuery, query);
    return this.attempts.saveRecording(user, id, q.part, q.index, file, q.durationMs);
  }

  @Get('attempts/:id/recordings/:recordingId')
  async recording(
    @CurrentUser() user: EduUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('recordingId', ParseUUIDPipe) recordingId: string,
    @Res() res: Response,
  ) {
    await this.attempts.sendRecording(user, id, recordingId, res);
  }

  @Get('attempts/:id/result')
  result(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.attempts.result(user, id);
  }

  @Put('attempts/:id/grade')
  grade(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.attempts.grade(user, id, parse(gradeBody, body));
  }
}
