import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { parse, uuid } from '../../common/zod';
import { CurrentUser } from '../auth/auth.guard';
import type { EduUser } from '../identity/identity.types';
import { AssignmentsService } from './assignments.service';

const createBody = z.object({
  testId: uuid,
  classId: uuid,
  title: z.string().trim().max(200).optional(),
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
});
const patchBody = z.object({ resultsReleased: z.boolean().optional(), closesAt: z.coerce.date().optional() });

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get('classes')
  classes(@CurrentUser() user: EduUser) {
    return this.assignments.manageableClasses(user);
  }

  @Get('mine')
  mine(@CurrentUser() user: EduUser) {
    return this.assignments.listForStudent(user);
  }

  @Get()
  list(@CurrentUser() user: EduUser) {
    return this.assignments.listForStaff(user);
  }

  @Post()
  create(@CurrentUser() user: EduUser, @Body() body: unknown) {
    return this.assignments.create(user, parse(createBody, body));
  }

  @Get(':id')
  report(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.report(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    return this.assignments.update(user, id, parse(patchBody, body));
  }

  @Delete(':id')
  remove(@CurrentUser() user: EduUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.remove(user, id);
  }
}
