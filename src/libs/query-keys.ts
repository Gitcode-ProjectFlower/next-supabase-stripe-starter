export const QUERY_KEYS = {
  usage: {
    stats: ['usage', 'stats'] as const,
  },
  selections: {
    all: ['selections'] as const,
    detail: (id: string) => ['selections', 'detail', id] as const,
  },
  qa: {
    result: (selectionId: string, qaId: string) => ['qa', 'result', selectionId, qaId] as const,
  },
  lookalikes: {
    search: (fingerprint: string) => ['lookalikes', 'search', fingerprint] as const,
  },
  downloads: {
    all: ['downloads'] as const,
  },
  activity: {
    recent: ['activity', 'recent'] as const,
  },
} as const;
