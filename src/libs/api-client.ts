'use client';

/**
 * Lightweight fetch wrapper that surfaces status codes and JSON error payloads.
 */
export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = (data as any)?.error || (data as any)?.message || response.statusText || 'Request failed';
    throw new ApiError(message, response.status, data ?? undefined);
  }

  return (data as T) ?? ({} as T);
}
