'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { ApiError, apiFetch } from './api-client';
import type { UserPlan } from './plan-config';
import { QUERY_KEYS } from './query-keys';
import { createSupabaseBrowserClient } from './supabase/supabase-browser-client';

type UsageStatsResponse = {
  downloads: number;
  ai_calls: number;
  downloadsLimit: number;
  aiCallsLimit: number;
  plan: UserPlan;
  period_start?: string;
  period_end?: string;
};

type SelectionListItem = {
  id: string;
  name: string;
  item_count: number;
  created_at: string;
  expires_at: string;
  criteria: Record<string, unknown>;
};

type SelectionsListResponse = { selections: SelectionListItem[] };

type SelectionItem = {
  doc_id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  street?: string;
  sectors?: string[];
  experience_years?: number;
  similarity?: number;
};

type SelectionDetailResponse = {
  selection: SelectionListItem & {
    items: SelectionItem[];
  };
};

type DownloadItem = {
  id: string;
  type: 'Lookalike CSV' | 'Q&A CSV';
  selectionId: string;
  selectionName?: string;
  createdAt: string;
  expiresAt: string;
  size: string;
  downloadUrl?: string;
};

type DownloadsResponse = {
  downloads: DownloadItem[];
};

export function useUsageStatsQuery(
  options?: Omit<UseQueryOptions<UsageStatsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<UsageStatsResponse, ApiError>({
    queryKey: QUERY_KEYS.usage.stats,
    queryFn: () => apiFetch<UsageStatsResponse>('/api/usage/stats'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useSelectionsQuery(
  options?: Omit<UseQueryOptions<SelectionsListResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SelectionsListResponse, ApiError>({
    queryKey: QUERY_KEYS.selections.all,
    queryFn: () => apiFetch<SelectionsListResponse>('/api/selections'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useSelectionDetailQuery(
  selectionId: string,
  options?: Omit<UseQueryOptions<SelectionDetailResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SelectionDetailResponse, ApiError>({
    queryKey: QUERY_KEYS.selections.detail(selectionId),
    queryFn: () => apiFetch<SelectionDetailResponse>(`/api/selections/${selectionId}`),
    enabled: !!selectionId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

export function useDownloadsQuery(
  options?: Omit<UseQueryOptions<DownloadsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DownloadsResponse, ApiError>({
    queryKey: QUERY_KEYS.downloads.all,
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new ApiError('Unauthorized', 401);
      }

      // Fetch downloads that haven't expired
      const { data: downloads, error } = await supabase
        .from('downloads')
        .select('id, type, selection_id, url, created_at, expires_at, row_count')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useDownloadsQuery] Error fetching downloads:', error);
        throw new ApiError('Failed to fetch downloads', 500, error);
      }

      // Format downloads with selection names if available
      const formattedDownloads: DownloadItem[] = await Promise.all(
        (downloads || []).map(async (download): Promise<DownloadItem> => {
          let selectionName: string | undefined;

          if (download.selection_id) {
            const { data: selection } = await supabase
              .from('selections')
              .select('name')
              .eq('id', download.selection_id)
              .single();

            selectionName = selection?.name;
          }

          // Calculate file size (rough estimate: ~200 bytes per row)
          const estimatedSizeKB = Math.round((download.row_count * 200) / 1024);
          const size = estimatedSizeKB > 0 ? `${estimatedSizeKB} KB` : '< 1 KB';

          const type: 'Lookalike CSV' | 'Q&A CSV' = download.type === 'lookalike' ? 'Lookalike CSV' : 'Q&A CSV';

          return {
            id: download.id,
            type,
            selectionId: download.selection_id || '',
            selectionName,
            createdAt: download.created_at,
            expiresAt: download.expires_at,
            size,
            downloadUrl: download.url,
          };
        })
      );

      return { downloads: formattedDownloads };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - downloads can change more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

type QAResultResponse = {
  id: string;
  selection_id: string;
  selection_name: string;
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at?: string;
  csv_url?: string;
  answers: Array<{
    doc_id: string;
    name: string;
    email: string;
    city?: string;
    answer: string;
    status: string;
    error_message?: string;
  }>;
};

export function useQAResultQuery(
  selectionId: string,
  qaId: string,
  options?: Omit<UseQueryOptions<QAResultResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<QAResultResponse, ApiError>({
    queryKey: QUERY_KEYS.qa.result(selectionId, qaId),
    queryFn: () => apiFetch<QAResultResponse>(`/api/selections/${selectionId}/qa/${qaId}`),
    enabled: !!selectionId && !!qaId && options?.enabled !== false,
    // Poll every 2 seconds if status is 'processing'
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 2000 : false;
    },
    staleTime: 0, // Always consider stale for polling
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}
