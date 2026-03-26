'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, MessageSquare } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getVisibleColumns, type UserPlan } from '@/libs/plan-config';
import { useSelectionDetailQuery, useUsageStatsQuery, useQASessionListQuery } from '@/libs/queries';
import { QUERY_KEYS } from '@/libs/query-keys';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import { FullPageLoader } from '@/components/full-page-loader';
import { STANDARD_QUESTIONS, StandardQuestionTile } from '@/components/selection/standard-question-tile';
import { StandardQuestionModal } from '@/components/selection/standard-question-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/cn';
import { getLocalePath } from '@/utils/get-locale-path';
import { normalizeValue } from '@/utils/normalize-value';

// All 17 required fields + similarity (optional)
type ColumnKey =
  | 'name'
  | 'domain'
  | 'company_size'
  | 'email'
  | 'phone'
  | 'street'
  | 'city'
  | 'postal_code'
  | 'sector_level1'
  | 'sector_level2'
  | 'sector_level3'
  | 'region_level1'
  | 'region_level2'
  | 'region_level3'
  | 'region_level4'
  | 'linkedin_company_url'
  | 'legal_form'
  | 'similarity';

interface SelectionItem {
  id?: string; // Database UUID (if available)
  doc_id: string;
  // All 17 required fields (always present, may be empty)
  name: string;
  domain?: string;
  company_size?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  sector_level1?: string;
  sector_level2?: string;
  sector_level3?: string;
  region_level1?: string;
  region_level2?: string;
  region_level3?: string;
  region_level4?: string;
  linkedin_company_url?: string;
  legal_form?: string;
  similarity?: number;
  // Legacy fields (for backward compatibility)
  experience_years?: number;
  sectors?: string[];
}

interface SelectionDetail {
  id: string;
  name: string;
  item_count: number;
  created_at: string;
  expires_at: string;
  criteria: {
    names?: string[];
    sectors?: string[];
    regions?: string[];
    experience_years?: number[];
    top_k?: number;
  };
  items: SelectionItem[];
}

const COLUMN_CONFIG: Record<
  ColumnKey,
  {
    label: string;
    render: (row: SelectionItem) => React.ReactNode;
  }
> = {
  name: {
    label: 'Name',
    render: (row) => normalizeValue(row.name) || '-',
  },
  domain: {
    label: 'Domain',
    render: (row) => normalizeValue(row.domain) || '-',
  },
  company_size: {
    label: 'Company Size',
    render: (row) => normalizeValue(row.company_size) || '-',
  },
  email: {
    label: 'Email',
    render: (row) => normalizeValue(row.email) || '-',
  },
  phone: {
    label: 'Phone',
    render: (row) => normalizeValue(row.phone) || '-',
  },
  street: {
    label: 'Street',
    render: (row) => normalizeValue(row.street) || '-',
  },
  city: {
    label: 'City',
    render: (row) => normalizeValue(row.city) || '-',
  },
  postal_code: {
    label: 'Postal Code',
    render: (row) => normalizeValue(row.postal_code) || '-',
  },
  sector_level1: {
    label: 'Sector Level 1',
    render: (row) => normalizeValue(row.sector_level1) || '-',
  },
  sector_level2: {
    label: 'Sector Level 2',
    render: (row) => normalizeValue(row.sector_level2) || '-',
  },
  sector_level3: {
    label: 'Sector Level 3',
    render: (row) => normalizeValue(row.sector_level3) || '-',
  },
  region_level1: {
    label: 'Region Level 1',
    render: (row) => normalizeValue(row.region_level1) || '-',
  },
  region_level2: {
    label: 'Region Level 2',
    render: (row) => normalizeValue(row.region_level2) || '-',
  },
  region_level3: {
    label: 'Region Level 3',
    render: (row) => normalizeValue(row.region_level3) || '-',
  },
  region_level4: {
    label: 'Region Level 4',
    render: (row) => normalizeValue(row.region_level4) || '-',
  },
  linkedin_company_url: {
    label: 'LinkedIn URL',
    render: (row) => {
      const url = normalizeValue(row.linkedin_company_url);
      return url ? (
        <a href={url} target='_blank' rel='noopener noreferrer' className='text-blue-600 hover:underline'>
          {url}
        </a>
      ) : (
        '-'
      );
    },
  },
  legal_form: {
    label: 'Legal Form',
    render: (row) => normalizeValue(row.legal_form) || '-',
  },
  similarity: {
    label: 'Fit Score',
    render: (row) =>
      row.similarity ? (
        <div className='flex items-center gap-2'>
          <div className='h-2 w-24 overflow-hidden rounded-full bg-gray-200'>
            <div
              className='h-full bg-gradient-to-r from-blue-500 to-green-500'
              style={{ width: `${(row.similarity * 100).toFixed(0)}%` }}
            />
          </div>
          <span className='text-xs font-medium text-gray-700'>{(row.similarity * 100).toFixed(0)}%</span>
        </div>
      ) : (
        '-'
      ),
  },
};

export function Selection() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'uk';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createSupabaseBrowserClient();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [qaPrompt, setQaPrompt] = useState('');
  const [isProcessingQA, setIsProcessingQA] = useState(false);
  const [qaProgress, setQaProgress] = useState(0);
  const [qaSessionId, setQaSessionId] = useState<string | null>(null);
  const [qaStatus, setQaStatus] = useState<'processing' | 'completed' | 'failed' | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Standard Question state
  const [activeSqId, setActiveSqId] = useState<'1' | '2' | '3' | '4' | null>(null);
  const [isSqModalOpen, setIsSqModalOpen] = useState(false);
  const [isProcessingSq, setIsProcessingSq] = useState(false);
  const [sqError, setSqError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan>('anonymous');
  const { data: usageStats, error: usageError } = useUsageStatsQuery({ retry: 0 });
  const {
    data: selectionData,
    isLoading: isSelectionLoading,
    error: selectionError,
  } = useSelectionDetailQuery(params.id as string, {
    enabled: !isCheckingAuth && !!params.id,
    retry: 0,
  });

  const { data: qaSessionsData } = useQASessionListQuery(params.id as string, {
    enabled: !isCheckingAuth && !!params.id,
  });

  const visibleColumns = useMemo<ColumnKey[]>(() => {
    // Get columns allowed for this plan
    const allowedColumns = getVisibleColumns(userPlan);

    // Filter to only include columns that exist in COLUMN_CONFIG
    const cols = allowedColumns.filter((c): c is ColumnKey => Object.prototype.hasOwnProperty.call(COLUMN_CONFIG, c));

    // Always include 'name' as fallback, but ensure we only show what's allowed
    return cols.length > 0 ? cols : ['name'];
  }, [userPlan]);

  useEffect(() => {
    if (usageStats?.plan) {
      setUserPlan((usageStats.plan as UserPlan) || 'free_tier');
    } else if (usageError) {
      setUserPlan('free_tier');
    }
  }, [usageError, usageStats]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(getLocalePath(locale, '/login'));
        return;
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [router, supabase, locale]);

  useEffect(() => {
    if (selectionError) {
      toast({
        title: 'Error',
        description: selectionError.message || 'Failed to load selection',
        variant: 'destructive',
      });
      if ((selectionError as any).status === 401) {
        router.push(getLocalePath(locale, '/login'));
      } else if ((selectionError as any).status === 404) {
        router.push(getLocalePath(locale, '/selections'));
      }
    }
  }, [router, selectionError, toast]);

  // Cleanup polling interval on unmount or modal close
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isQAModalOpen && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [isQAModalOpen]);

  const selection = selectionData?.selection as SelectionDetail | null;
  const isLoading = isCheckingAuth || isSelectionLoading;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleQA = async () => {
    if (!qaPrompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    if (!params.id) {
      toast({
        title: 'Error',
        description: 'Invalid selection ID',
        variant: 'destructive',
      });
      return;
    }

    if (!selection || !selection.items || selection.items.length === 0) {
      toast({
        title: 'Error',
        description: 'No companies found in this selection',
        variant: 'destructive',
      });
      return;
    }

    // Client-side verification: Check usage limits before making request
    if (usageStats) {
      const itemCount = selection.item_count || selection.items.length || 1;
      const requiredCalls = itemCount;
      const remainingCalls = usageStats.aiCallsLimit - usageStats.ai_calls;

      if (remainingCalls < requiredCalls) {
        toast({
          title: 'AI Limit Reached',
          description: `You need ${requiredCalls} AI calls but only have ${remainingCalls} remaining. Upgrade your plan to continue.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsProcessingQA(true);
    setQaProgress(0);

    try {
      // Start Q&A job
      const response = await fetch(`/api/selections/${params.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: qaPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle different error cases
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to use Q&A features',
            variant: 'destructive',
          });
          router.push(getLocalePath(locale, '/login'));
          return;
        }

        if (response.status === 403) {
          if (errorData.error === 'CAP_REACHED') {
            const message =
              errorData.type === 'ai_limit'
                ? `You've reached your AI question limit (${errorData.current}/${errorData.limit}). Upgrade your plan to continue.`
                : errorData.message || 'You have reached your usage limit.';
            toast({
              title: 'Limit Reached',
              description: message,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Access Denied',
              description: errorData.message || 'You do not have permission to perform this action',
              variant: 'destructive',
            });
          }
          return;
        }

        if (response.status === 404) {
          toast({
            title: 'Selection Not Found',
            description: 'The selection you are trying to access no longer exists',
            variant: 'destructive',
          });
          router.push(getLocalePath(locale, '/selections'));
          return;
        }

        if (response.status === 400) {
          toast({
            title: errorData.error === 'Cannot export empty selection' ? 'Cannot Export' : 'Invalid Request',
            description: errorData.message || errorData.error || 'Please check your input and try again',
            variant: 'destructive',
          });
          return;
        }

        // Generic error for 500 or other status codes
        toast({
          title: 'Error',
          description: errorData.error || errorData.message || 'Failed to start Q&A job. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();

      if (!data.qaSessionId) {
        toast({
          title: 'Error',
          description: 'Q&A session was not created. Please try again.',
          variant: 'destructive',
        });
        setIsProcessingQA(false);
        return;
      }

      // Store session ID and start polling for progress
      setQaSessionId(data.qaSessionId);
      setQaStatus('processing');
      setQaProgress(0);

      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Start polling for progress
      pollIntervalRef.current = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/selections/${params.id}/qa/${data.qaSessionId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setQaProgress(progressData.progress || 0);
            setQaStatus(progressData.status);

            if (progressData.status === 'completed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }

              // Check if answers were actually saved to the database
              const answersCount = progressData.answers?.length || 0;

              if (answersCount === 0) {
                // No answers were saved - show error and don't navigate
                setIsProcessingQA(false);
                setQaStatus('failed');
                toast({
                  title: 'Error',
                  description: 'Q&A processing completed but no answers were generated. Please try again.',
                  variant: 'destructive',
                });
                return;
              }

              // Answers exist - navigate to results page
              setIsProcessingQA(false);

              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qa.result(params.id as string, data.qaSessionId) });
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usage.stats });

              toast({
                title: 'Success',
                description: `Q&A completed! Found ${answersCount} answer${answersCount !== 1 ? 's' : ''
                  }. Redirecting...`,
              });
              // Small delay before navigation to show completion
              setTimeout(() => {
                setIsQAModalOpen(false);
                setQaPrompt('');
                setQaSessionId(null);
                setQaStatus(null);
                router.push(getLocalePath(locale, `/selections/${params.id}/qa/${data.qaSessionId}`));
              }, 1000);
            } else if (progressData.status === 'failed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setIsProcessingQA(false);
              toast({
                title: 'Error',
                description: progressData.error_message || 'Q&A processing failed',
                variant: 'destructive',
              });
              setQaStatus('failed');
            }
          }
        } catch (error) {
          console.error('Error polling Q&A progress:', error);
        }
      }, 2000); // Poll every 2 seconds
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start Q&A. Please try again.',
        variant: 'destructive',
      });
      setIsProcessingQA(false);
      setQaProgress(0);
    }
  };

  const handleExport = async () => {
    if (!params.id) {
      toast({
        title: 'Error',
        description: 'Invalid selection ID',
        variant: 'destructive',
      });
      return;
    }

    // Client-side verification: Check if selection has items
    if (selection && (selection.item_count === 0 || !selection.items || selection.items.length === 0)) {
      toast({
        title: 'Cannot Export',
        description: 'This selection has no companies. Please add companies to the selection before exporting.',
        variant: 'destructive',
      });
      return;
    }

    // Client-side verification: Check usage limits before making request
    if (usageStats && selection) {
      const itemCount = selection.item_count || 0;
      const remainingDownloads = usageStats.downloadsLimit - usageStats.downloads;

      if (remainingDownloads < itemCount) {
        toast({
          title: 'Download Limit Reached',
          description: `You need to download ${itemCount} records but only have ${remainingDownloads} remaining. Upgrade your plan to continue.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsExporting(true);
    try {
      const response = await fetch(`/api/selections/${params.id}/export`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle different error cases
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to export selections',
            variant: 'destructive',
          });
          router.push(getLocalePath(locale, '/login'));
          return;
        }

        if (response.status === 403) {
          if (errorData.error === 'CAP_REACHED') {
            const message =
              errorData.type === 'download_limit'
                ? `You've reached your download limit (${errorData.current}/${errorData.limit}). Upgrade your plan to continue.`
                : errorData.message || 'You have reached your usage limit.';
            toast({
              title: 'Limit Reached',
              description: message,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Access Denied',
              description: errorData.message || 'You do not have permission to export this selection',
              variant: 'destructive',
            });
          }
          return;
        }

        if (response.status === 404) {
          toast({
            title: 'Selection Not Found',
            description: 'The selection you are trying to export no longer exists',
            variant: 'destructive',
          });
          router.push(getLocalePath(locale, '/selections'));
          return;
        }

        // Generic error for 500 or other status codes
        toast({
          title: 'Export Failed',
          description: errorData.error || errorData.message || 'Failed to start export. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.downloads.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usage.stats });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.selections.detail(params.id as string) });

      toast({
        title: 'Export Started',
        description:
          'Your Excel file is being prepared. You can download it from the Downloads page when ready. You\u2019ll also receive an email notification.',
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Network Error',
        description: error.message || 'Failed to connect to server. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRunSQ = async (sqId: '1' | '2' | '3' | '4', formInput: Record<string, unknown>) => {
    if (!params.id) return;

    setSqError(null);
    setIsProcessingSq(true);
    try {
      const response = await fetch(`/api/selections/${params.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: STANDARD_QUESTIONS.find((sq) => sq.id === sqId)?.title ?? `Standard Question ${sqId}`,
          standard_question_id: sqId,
          form_input: formInput,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setSqError(err.error || err.message || 'Failed to start Standard Question job');
        setIsProcessingSq(false);
        return;
      }

      const data = await response.json();

      if (data.qaSessionId) {
        setIsSqModalOpen(false);
        setActiveSqId(null);
        setIsProcessingSq(false);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.qa.list(params.id as string) });
        router.push(getLocalePath(locale, `/selections/${params.id}/qa/${data.qaSessionId}`));
      }
    } catch (error: any) {
      setSqError(error.message || 'Failed to start Standard Question');
      setIsProcessingSq(false);
    }
  };

  if (isLoading) return <FullPageLoader text='Loading selection...' />;

  if (!selection) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className='mb-6'>
        <Button
          variant='ghost'
          className='-ml-2 mb-4 hover:bg-gray-100'
          onClick={() => router.push(getLocalePath(locale, '/selections'))}
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Saved
        </Button>

        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-black'>{selection.name}</h1>
            <div className='mt-2 flex items-center gap-4 text-sm text-gray-600'>
              <span>{selection.item_count} companies</span>
              <span>•</span>
              <span>Created: {formatDate(selection.created_at)}</span>
              <span>•</span>
              <span>Expires: {formatDate(selection.expires_at)}</span>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='rounded-lg px-4 py-2 hover:bg-gray-100'
              onClick={() => setIsQAModalOpen(true)}
            >
              <MessageSquare className='mr-2 h-4 w-4' />
              Ask a custom question (advanced)
            </Button>
            <Button
              className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className='mr-2 h-4 w-4' />
              {isExporting ? 'Preparing...' : 'Prepare Download'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Summary */}
      {selection.criteria && (
        <div className='mb-6 rounded-2xl border bg-white p-4 shadow-sm'>
          <h2 className='mb-2 font-semibold text-gray-900'>Search Criteria</h2>
          <div className='flex flex-wrap gap-2'>
            {selection.criteria.names && selection.criteria.names.length > 0 && (
              <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                <span className='font-medium text-gray-700'>Names:</span>{' '}
                <span className='text-gray-600'>{selection.criteria.names.join(', ')}</span>
              </div>
            )}
            {selection.criteria.sectors && selection.criteria.sectors.length > 0 && (
              <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                <span className='font-medium text-gray-700'>Sectors:</span>{' '}
                <span className='text-gray-600'>{selection.criteria.sectors.length} selected</span>
              </div>
            )}
            {selection.criteria.regions && selection.criteria.regions.length > 0 && (
              <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                <span className='font-medium text-gray-700'>Regions:</span>{' '}
                <span className='text-gray-600'>{selection.criteria.regions.length} selected</span>
              </div>
            )}
            {selection.criteria.top_k && (
              <div className='rounded-lg bg-gray-100 px-3 py-1.5 text-sm'>
                <span className='font-medium text-gray-700'>Top-K:</span>{' '}
                <span className='text-gray-600'>{selection.criteria.top_k}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyses Applied */}
      <div className='mb-6'>
        <h3 className='mb-2 text-sm font-medium text-gray-600'>Analyses applied</h3>
        {qaSessionsData && qaSessionsData.sessions.filter((s) => s.status === 'completed').length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {qaSessionsData.sessions
              .filter((s) => s.status === 'completed')
              .map((session) => {
                const sqConfig = STANDARD_QUESTIONS.find((sq) => sq.id === session.standard_question_id);
                return (
                  <span
                    key={session.id}
                    className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700'
                  >
                    {sqConfig ? sqConfig.title : 'Custom'}
                  </span>
                );
              })}
          </div>
        ) : (
          <p className='text-sm text-gray-400'>No analyses applied yet</p>
        )}
      </div>

      {/* Standard Questions Section */}
      <div className='mb-6'>
        <h2 className='mb-3 font-semibold text-gray-900'>Run a new analysis on this selection</h2>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          {STANDARD_QUESTIONS.map((sq) => (
            <StandardQuestionTile
              key={sq.id}
              config={sq}
              secondary
              onRun={(sqId) => {
                setActiveSqId(sqId);
                setIsSqModalOpen(true);
              }}
              disabled={isProcessingSq}
            />
          ))}
        </div>

        {qaSessionsData && qaSessionsData.sessions.length > 0 && (
          <div className='mt-4 space-y-2'>
            <h3 className='text-sm font-medium text-gray-600'>Previous runs</h3>
            {qaSessionsData.sessions.map((session) => {
              const sqConfig = STANDARD_QUESTIONS.find((sq) => sq.id === session.standard_question_id);
              const label = sqConfig ? sqConfig.title : session.prompt;
              return (
                <div
                  key={session.id}
                  className='flex items-center justify-between rounded-xl border bg-white px-4 py-3'
                >
                  <div className='flex items-center gap-3'>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        session.status === 'completed' && 'bg-green-100 text-green-800',
                        session.status === 'processing' && 'bg-blue-100 text-blue-800',
                        session.status === 'failed' && 'bg-red-100 text-red-800'
                      )}
                    >
                      {session.status}
                    </span>
                    <span className='text-sm font-medium text-gray-900'>{label}</span>
                    <span className='text-xs text-gray-400'>
                      {new Date(session.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Button
                    variant='outline'
                    className='h-8 px-3 text-sm'
                    onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}/qa/${session.id}`))}
                  >
                    View Results
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Candidates Table */}
      <div className='overflow-hidden rounded-2xl border bg-white shadow-sm'>
        <div className='overflow-auto'>
          <Table>
            <TableHeader className='bg-gray-50'>
              <TableRow className='hover:bg-transparent'>
                {visibleColumns.map((key) => (
                  <TableHead key={key} className='whitespace-nowrap px-4 py-3 font-semibold text-gray-700'>
                    {COLUMN_CONFIG[key].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {selection.items?.map((item, index) => (
                <TableRow key={item.id || `${item.doc_id}-${index}`} className='hover:bg-gray-50'>
                  {visibleColumns.map((key) => (
                    <TableCell
                      key={key}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-600',
                        key === 'name' && 'font-medium text-gray-900',
                        key === 'email' || key === 'city' || key === 'street' || key === 'linkedin_company_url'
                          ? 'max-w-[220px] truncate'
                          : 'whitespace-nowrap'
                      )}
                      title={
                        key === 'email'
                          ? normalizeValue(item.email) || ''
                          : key === 'city' || key === 'street' || key === 'linkedin_company_url'
                            ? normalizeValue((item as any)[key]) || ''
                            : undefined
                      }
                    >
                      {COLUMN_CONFIG[key].render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Standard Question Modal */}
      <StandardQuestionModal
        sqId={activeSqId}
        open={isSqModalOpen}
        onClose={() => {
          setIsSqModalOpen(false);
          setActiveSqId(null);
          setSqError(null);
        }}
        onSubmit={handleRunSQ}
        isProcessing={isProcessingSq}
        error={sqError}
      />

      {/* Q&A Modal */}
      <Dialog open={isQAModalOpen} onOpenChange={setIsQAModalOpen}>
        <DialogContent className='bg-white sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Ask a custom question</DialogTitle>
            <DialogDescription className='text-gray-700'>
              Apply your question to all companies in this selection. You will be redirected to the results page.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <Textarea
              placeholder='e.g. What does this company do? Who are their target customers?'
              value={qaPrompt}
              onChange={(e) => setQaPrompt(e.target.value)}
              className='focus:bo min-h-[120px] border-gray-700 placeholder:text-gray-500'
              disabled={isProcessingQA}
            />

            {isProcessingQA && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm text-gray-600'>
                  <span>
                    {qaStatus === 'completed'
                      ? 'Q&A Completed!'
                      : qaStatus === 'failed'
                        ? 'Q&A Failed'
                        : 'Processing Q&A...'}
                  </span>
                  <span>{qaProgress}%</span>
                </div>
                <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
                  <div
                    className={`h-full transition-all duration-500 ${qaStatus === 'completed' ? 'bg-green-600' : qaStatus === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                    style={{ width: `${qaProgress}%` }}
                  />
                </div>
                <p className='text-xs text-gray-500'>
                  {qaStatus === 'completed'
                    ? 'Redirecting to results page...'
                    : qaStatus === 'failed'
                      ? 'An error occurred during processing. Please try again.'
                      : 'This may take a few minutes depending on the number of companies...'}
                </p>
                {qaStatus === 'completed' && qaSessionId && (
                  <Button
                    className='mt-2 w-full bg-blue-600 hover:bg-blue-700'
                    onClick={() => {
                      setIsQAModalOpen(false);
                      setQaPrompt('');
                      setQaSessionId(null);
                      setQaStatus(null);
                      router.push(getLocalePath(locale, `/selections/${params.id}/qa/${qaSessionId}`));
                    }}
                  >
                    View Results
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                if (qaSessionId && qaStatus === 'processing') {
                  // Capture before clearing state to avoid race condition
                  const sessionId = qaSessionId;
                  setIsQAModalOpen(false);
                  setQaPrompt('');
                  setQaSessionId(null);
                  setQaStatus(null);
                  router.push(getLocalePath(locale, `/selections/${params.id}/qa/${sessionId}`));
                } else {
                  setIsQAModalOpen(false);
                  setQaPrompt('');
                  setQaSessionId(null);
                  setQaStatus(null);
                }
              }}
              disabled={isProcessingQA && qaStatus === 'processing'}
            >
              {qaSessionId && qaStatus === 'processing' ? 'View Progress' : 'Cancel'}
            </Button>
            <Button
              onClick={handleQA}
              disabled={isProcessingQA || !qaPrompt.trim()}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isProcessingQA ? 'Processing...' : 'Generate insights'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
