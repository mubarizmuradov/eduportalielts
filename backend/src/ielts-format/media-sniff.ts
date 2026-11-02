/** Detects audio / image types from magic bytes: never trust a declared mime type. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  const ascii = (a: number, b: number) => buf.subarray(a, b).toString('latin1');
  if (buf[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio/wav';
  if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (ascii(0, 4) === 'OggS') return 'audio/ogg';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'audio/webm';
  if (ascii(4, 8) === 'ftyp') return 'audio/mp4';
  const head = buf.subarray(0, 2048).toString('utf8').replace(/^﻿/, '').trimStart();
  if ((head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!--')) && head.includes('<svg'))
    return 'image/svg+xml';
  return null;
}

/** SVGs are only shown through <img> (no script execution), but refuse active content anyway. */
export function isSafeSvg(buf: Buffer): boolean {
  const s = buf.toString('utf8').toLowerCase();
  return !/<script|<foreignobject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object/.test(s);
}

export const MAX_AUDIO_BYTES = 40 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
