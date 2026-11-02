import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@eduielts/ielts-client';

/** EduPortal IELTS own database (read/write, migrated by this repository). */
@Injectable()
export class IeltsPrisma extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
