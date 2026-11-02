import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Env } from '../config/env';

const SAFE_SEGMENT = /^[A-Za-z0-9._-]{1,120}$/;

/** Files on local disk (UPLOAD_DIR, a Docker volume in production). */
@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get root() {
    return resolve(this.config.get('UPLOAD_DIR', { infer: true }));
  }

  private path(...segments: string[]) {
    for (const s of segments) if (!SAFE_SEGMENT.test(s) || s === '..' || s === '.') throw new Error(`unsafe path segment ${s}`);
    return join(this.root, ...segments);
  }

  async write(dir: string[], name: string, data: Buffer) {
    await mkdir(this.path(...dir), { recursive: true });
    await writeFile(this.path(...dir, name), data, { mode: 0o640 });
  }

  async removeDir(dir: string[]) {
    await rm(this.path(...dir), { recursive: true, force: true });
  }

  /**
   * Streams a stored file (supports HTTP Range, so audio can resume).
   * Stored files are never rendered as documents: strict CSP + nosniff.
   */
  send(res: Response, dir: string[], name: string, mimeType: string, cache = 'private, max-age=3600') {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('Cache-Control', cache);
    res.sendFile(this.path(...dir, name), { headers: { 'Content-Type': mimeType }, acceptRanges: true });
  }
}
