'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { ApiError, apiFetch } from './api-client';
import type { UserPlan } from './plan-config';
import { QUERY_KEYS } from './query-keys';

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
