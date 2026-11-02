import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { EduportalPrisma } from '../prisma/eduportal-prisma.service';
import { IeltsPrisma } from '../prisma/ielts-prisma.service';
import { Public } from '../modules/auth/auth.guard';

@Controller('health')
export class HealthController {
  constructor(
    private readonly ielts: IeltsPrisma,
    private readonly edu: EduportalPrisma,
  ) {}

  @Public()
  @Get()
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready() {
    const checks = await Promise.allSettled([this.ielts.$queryRaw`SELECT 1`, this.edu.$queryRaw`SELECT 1`]);
    const result = {
      ieltsDatabase: checks[0].status === 'fulfilled',
      eduportalDatabase: checks[1].status === 'fulfilled',
    };
    if (!result.ieltsDatabase || !result.eduportalDatabase) throw new ServiceUnavailableException(result);
    return { status: 'ready', ...result };
  }
}
