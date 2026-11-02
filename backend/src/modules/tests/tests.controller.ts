import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { parse, uuid } from '../../common/zod';
import { CurrentUser } from '../auth/auth.guard';
import type { EduUser } from '../identity/identity.types';
import { TestsService } from './tests.service';

const importBody = z.object({ academyId: uuid, package: z.unknown() });
const validateBody = z.object({ package: z.unknown() });

/**
 * IELTS test library.
 *   POST /tests/validate  {package}             dry run, returns errors / summary
 *   POST /tests/import    {academyId, package}  builds and stores the test
 */
@Controller('tests')
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Post('validate')
  @HttpCode(200)
  async validate(@CurrentUser() user: EduUser, @Body() body: unknown) {
    if ((await this.tests.staffAcademies(user)).length === 0 && !user.isSystemAdmin)
      return { ok: false, errors: [{ path: '', message: 'Only staff can validate packages' }], warnings: [] };
    return this.tests.validate(parse(validateBody, body).package);
  }

  @Post('import')
  import(@CurrentUser() user: EduUser, @Body() body: unknown) {
    const b = parse(importBody, body);
    return this.tests.import(user, b.academyId, b.package);
  }

  @Get()
  list(@CurrentUser() user: EduUser, @Query('academyId') academyId?: string) {
    return this.tests.list(user, academyId ? parse(uuid, academyId) : undefined);
  }

  @Get(':id')
  get(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tests.preview(user, id);
  }

  @Delete(':id')
  archive(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tests.archive(user, id);
  }

  @Get(':id/assets/:key')
  async asset(
    @CurrentUser() user: EduUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('key') key: string,
    @Res() res: Response,
  ) {
    await this.tests.sendAsset(user, id, parse(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), key), res);
  }
}
