import { Global, Module } from '@nestjs/common';
import { EduportalPrisma } from './eduportal-prisma.service';
import { IeltsPrisma } from './ielts-prisma.service';

@Global()
@Module({ providers: [IeltsPrisma, EduportalPrisma], exports: [IeltsPrisma, EduportalPrisma] })
export class PrismaModule {}
