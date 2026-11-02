import { isSafeSvg, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, sniffMime } from '../../ielts-format/media-sniff';
import type { BuiltAsset } from '../../ielts-format/exam.types';

export class AssetFetchError extends Error {}

/**
 * Downloads a package asset given as an https URL, once, at import time.
 * Only allow-listed hosts, no redirects, size-capped while streaming, and the
 * real file type must match the declared one.
 */
export async function fetchAsset(asset: BuiltAsset, allowedHosts: string[], timeoutMs = 30_000): Promise<Buffer> {
  const url = new URL(asset.url!);
  if (url.protocol !== 'https:') throw new AssetFetchError(`${asset.id}: only https URLs`);
  if (!allowedHosts.includes(url.hostname.toLowerCase()))
    throw new AssetFetchError(`${asset.id}: host ${url.hostname} is not in ASSET_FETCH_ALLOWED_HOSTS`);
  const max = asset.kind === 'audio' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'error', signal: ctrl.signal });
    if (!res.ok || !res.body) throw new AssetFetchError(`${asset.id}: download failed (HTTP ${res.status})`);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > max) throw new AssetFetchError(`${asset.id}: larger than ${max / 1024 / 1024} MB`);
      chunks.push(Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    const sniffed = sniffMime(buf);
    if (sniffed !== asset.mimeType)
      throw new AssetFetchError(`${asset.id}: file content is ${sniffed ?? 'unknown'}, declared ${asset.mimeType}`);
    if (sniffed === 'image/svg+xml' && !isSafeSvg(buf)) throw new AssetFetchError(`${asset.id}: SVG contains active content`);
    return buf;
  } catch (e) {
    if (e instanceof AssetFetchError) throw e;
    throw new AssetFetchError(`${asset.id}: download failed (${(e as Error).message})`);
  } finally {
    clearTimeout(timer);
  }
}

export const EXTENSIONS: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};
