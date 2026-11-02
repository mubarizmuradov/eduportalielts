import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env';

/** Shared by main() and the e2e tests. Create the app with `bodyParser: false`. */
export async function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService<Env, true>);
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  // IELTS packages carry base64 audio: only these two routes accept big bodies.
  const big = express.json({ limit: `${config.get('MAX_PACKAGE_MB', { infer: true })}mb` });
  app.use('/tests/import', big);
  app.use('/tests/validate', big);
  app.use(express.json({ limit: '1mb' }));
  // EduPortal SSO posts the assertion as a form.
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.enableCors({
    origin: config.get('CORS_ORIGIN', { infer: true }).split(','),
    credentials: true,
  });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  await configureApp(app);
  const port = app.get(ConfigService<Env, true>).get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`EduPortal IELTS API listening on :${port}`, 'Bootstrap');
}

if (require.main === module) void bootstrap();
