import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CsrfMiddleware } from './common/csrf.middleware';
import { validateEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TestsModule } from './modules/tests/tests.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    PrismaModule,
    IdentityModule,
    AuthModule,
    TestsModule,
    AssignmentsModule,
    AttemptsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      // EduPortal posts this form cross-origin; it is protected by the signed
      // state cookie + single-use signed assertion instead (sso.service.ts).
      .exclude({ path: 'auth/sso/callback', method: RequestMethod.POST })
      .forRoutes('*');
  }
}
