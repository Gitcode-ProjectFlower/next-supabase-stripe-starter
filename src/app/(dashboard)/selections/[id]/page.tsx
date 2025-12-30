'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, MessageSquare } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { getVisibleColumns, type UserPlan } from '@/libs/plan-config';
import { useSelectionDetailQuery, useUsageStatsQuery } from '@/libs/queries';
import { QUERY_KEYS } from '@/libs/query-keys';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

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

type ColumnKey = 'name' | 'email' | 'phone' | 'city' | 'street' | 'sectors' | 'experience_years' | 'similarity';

interface SelectionItem {
  id?: string; // Database UUID (if available)
  doc_id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  street?: string;
  sectors?: string[];
  experience_years?: number;
  similarity?: number;
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
  name: { label: 'Name', render: (row) => row.name },
  email: { label: 'Email', render: (row) => row.email || '-' },
  phone: { label: 'Phone', render: (row) => row.phone || '-' },
  city: { label: 'City', render: (row) => row.city || '-' },
  street: { label: 'Street', render: (row) => row.street || '-' },
  sectors: { label: 'Sector', render: (row) => row.sectors?.[0] || '-' },
  experience_years: {
    label: 'Experience',
    render: (row) => (row.experience_years ? `${row.experience_years} years` : '-'),
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

export default function SelectionDetailPage() {
  const params = useParams();
  const router = useRouter();
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
        router.push('/login');
        return;
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [router, supabase]);

  useEffect(() => {
    if (selectionError) {
      toast({
        title: 'Error',
        description: selectionError.message || 'Failed to load selection',
        variant: 'destructive',
      });
      if ((selectionError as any).status === 401) {
        router.push('/login');
      } else if ((selectionError as any).status === 404) {
        router.push('/selections');
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
    return new Date(dateString).toLocaleDateString('en-GB', {
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
        description: 'No candidates found in this selection',
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
          router.push('/login');
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
          router.push('/selections');
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
                description: `Q&A completed! Found ${answersCount} answer${
                  answersCount !== 1 ? 's' : ''
                }. Redirecting...`,
              });
              // Small delay before navigation to show completion
              setTimeout(() => {
                setIsQAModalOpen(false);
                setQaPrompt('');
                setQaSessionId(null);
                setQaStatus(null);
                router.push(`/selections/${params.id}/qa/${data.qaSessionId}`);
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
        description: 'This selection has no candidates. Please add candidates to the selection before exporting.',
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
          router.push('/login');
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
          router.push('/selections');
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
        description: 'You will receive an email when your export is ready',
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

  if (isCheckingAuth || isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='text-lg font-medium text-gray-900'>Loading selection...</div>
        </div>
      </div>
    );
  }

  if (!selection) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <div className='mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-6'>
          <Button variant='ghost' className='-ml-2 mb-4 hover:bg-gray-100' onClick={() => router.push('/selections')}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Selections
          </Button>

          <div className='flex items-start justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-black'>{selection.name}</h1>
              <div className='mt-2 flex items-center gap-4 text-sm text-gray-600'>
                <span>{selection.item_count} candidates</span>
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
                Ask Q&A
              </Button>
              <Button
                className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className='mr-2 h-4 w-4' />
                {isExporting ? 'Exporting...' : 'Export CSV'}
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
                          key === 'email' || key === 'sectors' || key === 'city' || key === 'street'
                            ? 'max-w-[220px] truncate'
                            : 'whitespace-nowrap'
                        )}
                        title={
                          key === 'email'
                            ? item.email
                            : key === 'sectors'
                            ? item.sectors?.join(', ')
                            : key === 'city' || key === 'street'
                            ? (item as any)[key] || ''
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
      </div>

      {/* Q&A Modal */}
      <Dialog open={isQAModalOpen} onOpenChange={setIsQAModalOpen}>
        <DialogContent className='bg-white sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Ask Questions to Candidates</DialogTitle>
            <DialogDescription className='text-gray-700'>
              Enter your question(s) below. Each candidate will be asked the same question(s) and their answers will be
              generated based on their CV.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <Textarea
              placeholder='e.g., What is your experience with React? Do you have leadership experience?'
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
                    className={`h-full transition-all duration-500 ${
                      qaStatus === 'completed' ? 'bg-green-600' : qaStatus === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${qaProgress}%` }}
                  />
                </div>
                <p className='text-xs text-gray-500'>
                  {qaStatus === 'completed'
                    ? 'Redirecting to results page...'
                    : qaStatus === 'failed'
                    ? 'An error occurred during processing. Please try again.'
                    : 'This may take a few minutes depending on the number of candidates...'}
                </p>
                {qaStatus === 'completed' && qaSessionId && (
                  <Button
                    className='mt-2 w-full bg-blue-600 hover:bg-blue-700'
                    onClick={() => {
                      setIsQAModalOpen(false);
                      setQaPrompt('');
                      setQaSessionId(null);
                      setQaStatus(null);
                      router.push(`/selections/${params.id}/qa/${qaSessionId}`);
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
                  // If processing, navigate to results page instead of canceling
                  setIsQAModalOpen(false);
                  setQaPrompt('');
                  setQaSessionId(null);
                  setQaStatus(null);
                  router.push(`/selections/${params.id}/qa/${qaSessionId}`);
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
              {isProcessingQA ? 'Processing...' : 'Generate Answers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
