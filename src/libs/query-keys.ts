export const QUERY_KEYS = {
  usage: {
    stats: ['usage', 'stats'] as const,
  },
  selections: {
    all: ['selections'] as const,
    detail: (id: string) => ['selections', 'detail', id] as const,
  },
  lookalikes: {
    search: (fingerprint: string) => ['lookalikes', 'search', fingerprint] as const,
  },
} as const;
