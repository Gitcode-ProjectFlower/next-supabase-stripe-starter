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
    staleTime: 30 * 1000, // 30 seconds - shorter stale time for better UX
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    ...options,
  });
}

export function useSelectionsQuery(
  options?: Omit<UseQueryOptions<SelectionsListResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SelectionsListResponse, ApiError>({
    queryKey: QUERY_KEYS.selections.all,
    queryFn: () => apiFetch<SelectionsListResponse>('/api/selections'),
    staleTime: 30 * 1000, // 30 seconds - shorter stale time for better UX
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
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
    staleTime: 30 * 1000, // 30 seconds - shorter stale time for better UX
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
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
    id?: string;
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

type ActivityItem = {
  id: string;
  type: 'search' | 'qa' | 'export';
  status: 'queued' | 'running' | 'done' | 'failed';
  timestamp: string;
  label: string;
  link?: string;
  metadata?: {
    selectionId?: string;
    qaSessionId?: string;
    downloadId?: string;
    count?: number;
  };
};

type RecentActivityResponse = {
  activities: ActivityItem[];
};

export function useRecentActivityQuery(
  options?: Omit<UseQueryOptions<RecentActivityResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RecentActivityResponse, ApiError>({
    queryKey: QUERY_KEYS.activity.recent,
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

      // Fetch recent usage_log entries (last 20)
      const { data: usageLogs, error: usageError } = await supabase
        .from('usage_log')
        .select('id, action, count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (usageError) {
        console.error('[useRecentActivityQuery] Error fetching usage_log:', usageError);
        throw new ApiError('Failed to fetch recent activity', 500, usageError);
      }

      if (!usageLogs || usageLogs.length === 0) {
        return { activities: [] };
      }

      // Fetch related records to get metadata
      const activitiesResults = await Promise.all(
        usageLogs.map(async (log): Promise<ActivityItem | null> => {
          const logTime = new Date(log.created_at || Date.now());
          const timeWindow = 5 * 60 * 1000; // 5 minutes window

          if (log.action === 'ai_question') {
            // Find related QA session
            const { data: qaSessions } = await supabase
              .from('qa_sessions')
              .select('id, selection_id, prompt, status, created_at')
              .eq('user_id', user.id)
              .gte('created_at', new Date(logTime.getTime() - timeWindow).toISOString())
              .lte('created_at', new Date(logTime.getTime() + timeWindow).toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (qaSessions) {
              // Get selection name
              let selectionName = 'Unknown Selection';
              if (qaSessions.selection_id) {
                const { data: selection } = await supabase
                  .from('selections')
                  .select('name')
                  .eq('id', qaSessions.selection_id)
                  .single();
                selectionName = selection?.name || selectionName;
              }

              const statusMap: Record<string, 'queued' | 'running' | 'done' | 'failed'> = {
                processing: 'running',
                completed: 'done',
                failed: 'failed',
              };

              return {
                id: log.id,
                type: 'qa',
                status: statusMap[qaSessions.status] || 'queued',
                timestamp: log.created_at || new Date().toISOString(),
                label: `${selectionName} - ${qaSessions.prompt.substring(0, 50)}${
                  qaSessions.prompt.length > 50 ? '...' : ''
                }`,
                link: `/selections/${qaSessions.selection_id}/qa/${qaSessions.id}`,
                metadata: {
                  selectionId: qaSessions.selection_id,
                  qaSessionId: qaSessions.id,
                  count: log.count,
                },
              };
            }
          } else if (log.action === 'selection_created') {
            // Find related selection
            const { data: selections } = await supabase
              .from('selections')
              .select('id, name, item_count, created_at')
              .eq('user_id', user.id)
              .gte('created_at', new Date(logTime.getTime() - timeWindow).toISOString())
              .lte('created_at', new Date(logTime.getTime() + timeWindow).toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (selections) {
              return {
                id: log.id,
                type: 'search',
                status: 'done',
                timestamp: log.created_at || new Date().toISOString(),
                label: `${selections.name} - ${selections.item_count} candidates`,
                link: `/selections/${selections.id}`,
                metadata: {
                  selectionId: selections.id,
                  count: selections.item_count,
                },
              };
            }
          } else if (log.action === 'record_download') {
            // Find related download
            const { data: downloads } = await supabase
              .from('downloads')
              .select('id, selection_id, type, created_at, expires_at')
              .eq('user_id', user.id)
              .gte('created_at', new Date(logTime.getTime() - timeWindow).toISOString())
              .lte('created_at', new Date(logTime.getTime() + timeWindow).toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (downloads) {
              // Get selection name
              let selectionName = 'Unknown Selection';
              if (downloads.selection_id) {
                const { data: selection } = await supabase
                  .from('selections')
                  .select('name')
                  .eq('id', downloads.selection_id)
                  .single();
                selectionName = selection?.name || selectionName;
              }

              const isExpired = downloads.expires_at ? new Date(downloads.expires_at) < new Date() : false;
              const typeLabel = downloads.type === 'lookalike' ? 'Lookalike CSV' : 'Q&A CSV';

              return {
                id: log.id,
                type: 'export',
                status: isExpired ? 'failed' : 'done',
                timestamp: log.created_at || new Date().toISOString(),
                label: `${typeLabel} - ${selectionName}`,
                link: isExpired ? undefined : downloads.id, // Will be used to get download URL
                metadata: {
                  selectionId: downloads.selection_id || undefined,
                  downloadId: downloads.id,
                  count: log.count,
                },
              };
            }
          }

          // If no related record found, return basic activity
          let activityType: 'search' | 'qa' | 'export' = 'export';
          let activityLabel = `Export CSV - ${log.count} records`;

          if (log.action === 'ai_question') {
            activityType = 'qa';
            activityLabel = `Q&A run - ${log.count} profiles`;
          } else if (log.action === 'selection_created') {
            activityType = 'search';
            activityLabel = `Lookalike search - ${log.count} selection${log.count > 1 ? 's' : ''}`;
          }

          return {
            id: log.id,
            type: activityType,
            status: 'done',
            timestamp: log.created_at || new Date().toISOString(),
            label: activityLabel,
            metadata: {
              count: log.count,
            },
          };
        })
      );

      // Filter out null entries and sort by timestamp
      const validActivities: ActivityItem[] = activitiesResults.filter((a): a is ActivityItem => a !== null);
      validActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return { activities: validActivities.slice(0, 20) };
    },
    staleTime: 1 * 60 * 1000, // 1 minute - activity can change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}
