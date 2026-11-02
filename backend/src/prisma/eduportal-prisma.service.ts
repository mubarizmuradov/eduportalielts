import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@eduielts/eduportal-client';

/**
 * EduPortal database, READ ONLY. Only `identity/` readers may use this client;
 * no create/update/delete call is allowed anywhere (enforced by a unit test and
 * by the SELECT-only database role).
 */
@Injectable()
export class EduportalPrisma extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
