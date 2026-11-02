export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

const BASE = '/api';

export async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string>; raw?: BodyInit } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'x-eduielts-request': '1', ...init.headers };
  let body: BodyInit | undefined = init.raw;
  if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? (body ? 'POST' : 'GET'),
    headers,
    body,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    let data: { code?: string; message?: string | string[]; issues?: { path: string; message: string }[] } = {};
    try {
      data = await res.json();
    } catch {
      /* not json */
    }
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message ?? res.statusText;
    throw new ApiError(res.status, data.code ?? `HTTP_${res.status}`, message, data.issues);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

