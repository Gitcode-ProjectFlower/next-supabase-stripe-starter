'use client';

import { ArrowLeft, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { type UserPlan } from '@/libs/plan-config';
import { useQAResultQuery, useUsageStatsQuery } from '@/libs/queries';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import { FullPageLoader } from '@/components/full-page-loader';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { getLocalePath } from '@/utils/get-locale-path';
import { normalizeValue } from '@/utils/normalize-value';

interface CandidateAnswer {
  id?: string;
  doc_id: string;
  // All 17 required fields (always present, may be empty)
  name: string;
  domain?: string;
  company_size?: string;
  email: string;
  phone?: string;
  street?: string;
  city: string;
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
  // Q&A specific fields
  answer: string;
  status: 'success' | 'failed';
  error_message?: string;
}

interface QAResult {
  id: string;
  selection_id: string;
  selection_name: string;
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  csv_url?: string;
  answers: CandidateAnswer[];
}

export function QaResults() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'uk';
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userPlan, setUserPlan] = useState<UserPlan>('anonymous');
  const selectionId = params.id as string;
  const qaId = params.qa_id as string;

  // Get user plan from usage stats
  const { data: usageStats, error: usageError } = useUsageStatsQuery({
    enabled: !isCheckingAuth,
    retry: 0,
  });

  // Use TanStack Query with automatic polling for processing status
  const {
    data: qaResult,
    isLoading,
    error,
    isError,
    refetch,
  } = useQAResultQuery(selectionId, qaId, {
    enabled: !isCheckingAuth && !!selectionId && !!qaId,
    retry: 1,
  });

  // Update user plan when usage stats change
  useEffect(() => {
    if (usageStats?.plan) {
      setUserPlan((usageStats.plan as UserPlan) || 'free_tier');
    } else if (usageError) {
      setUserPlan('free_tier');
    }
  }, [usageStats, usageError]);

  // Auto-refetch when completed but no answers (in case answers were just saved)
  useEffect(() => {
    if (qaResult && qaResult.status === 'completed' && qaResult.answers && qaResult.answers.length === 0) {
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [qaResult, refetch]);

  // Column configuration for Q&A results - only essential fields
  const DISPLAY_FIELDS = ['name', 'email', 'city'] as const;

  const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    city: 'City',
    answer: 'Answer',
    status: 'Status',
  };

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
  }, [router, supabase]);

  // Handle errors
  useEffect(() => {
    if (error && !isCheckingAuth) {
      toast({
        title: 'Error Loading Q&A Results',
        description: `${error.message || 'Failed to load Q&A results'}`,
        variant: 'destructive',
      });
    }
  }, [error, isCheckingAuth, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleDownloadCSV = async () => {
    if (!result?.csv_url || result.csv_url === '#') {
      toast({
        title: 'Coming soon',
        description: 'CSV download will be available soon',
      });
      return;
    }

    // First, find the download record for this Q&A session
    // We need to get the download ID from the downloads table
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Fallback to direct download if not authenticated
        window.open(result.csv_url, '_blank');
        return;
      }

      const { data: downloads, error: downloadError } = await supabase
        .from('downloads')
        .select('id, row_count')
        .eq('user_id', user.id)
        .eq('selection_id', selectionId)
        .eq('type', 'qa')
        .order('created_at', { ascending: false })
        .limit(1)
        .single<{ id: string; row_count: number }>();

      if (!downloadError && downloads?.id) {
        // Call API endpoint to log the download
        const response = await fetch(`/api/downloads/${downloads.id}/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[QaResults] Failed to log download:', {
            status: response.status,
            error: errorData.error || 'Unknown error',
          });
          // Still allow download even if logging fails
        } else {
          const data = await response.json();
          // Use the URL from the API response (or fallback to original)
          const downloadUrl = data.downloadUrl || result.csv_url;
          window.open(downloadUrl, '_blank');
          return;
        }
      } else {
        console.warn('[QaResults] Could not find download record, logging may not work:', downloadError);
      }
    } catch (error) {
      console.error('[QaResults] Error calling download API:', error);
      // Fallback to direct download if API call fails
    }

    // Fallback: open URL directly if API call failed
    window.open(result.csv_url, '_blank');
  };

  const result = qaResult;

  if (isCheckingAuth || isLoading) return <FullPageLoader text='Loading Q&A results...' />;

  if (!result) {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <div className='mx-auto max-w-7xl'>
        {/* Header */}
        <div className='mb-6'>
          <Button
            variant='ghost'
            className='-ml-2 mb-4 hover:bg-gray-100'
            onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}`))}
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Selection
          </Button>

          <div className='flex items-start justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-black'>Q&A Results</h1>
              <div className='mt-2 flex items-center gap-4 text-sm text-gray-600'>
                <span>{result.selection_name}</span>
                <span>•</span>
                <span>Created: {formatDate(result.created_at)}</span>
                {result.completed_at && (
                  <>
                    <span>•</span>
                    <span>Completed: {formatDate(result.completed_at)}</span>
                  </>
                )}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              {getStatusBadge(result.status)}
              {result.status === 'completed' && (
                <Button
                  className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                  onClick={handleDownloadCSV}
                >
                  <Download className='mr-2 h-4 w-4' />
                  Download CSV
                </Button>
              )}
              {result.status === 'failed' && (
                <Button
                  className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                  onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}`))}
                >
                  Generate Answers Again
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className='mb-6 rounded-2xl border bg-white p-6'>
          <h2 className='mb-2 font-semibold text-gray-900'>Question</h2>
          <p className='text-gray-700'>{result.prompt}</p>

          {result.status === 'processing' && (
            <div className='mt-4 space-y-2'>
              <div className='flex items-center justify-between text-sm text-gray-600'>
                <span>Processing...</span>
                <span>{result.progress}%</span>
              </div>
              <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
                <div
                  className='h-full bg-blue-600 transition-all duration-500'
                  style={{ width: `${result.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className='mb-6 rounded-2xl border border-red-200 bg-red-50 p-6'>
            <h3 className='mb-2 text-lg font-semibold text-red-900'>Error Loading Q&A Results</h3>
            <div className='space-y-2 text-sm text-red-800'>
              <p>
                <strong>Status:</strong> {(error as any).status || 'Unknown'}
              </p>
              <p>
                <strong>Message:</strong> {error.message || 'Unknown error'}
              </p>
              {(error as any).data && (
                <details className='mt-4'>
                  <summary className='cursor-pointer font-medium'>Full Error Details (Click to expand)</summary>
                  <pre className='mt-2 overflow-auto rounded bg-red-100 p-3 text-xs'>
                    {JSON.stringify((error as any).data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        {/* Results Table */}
        {result.answers && Array.isArray(result.answers) && result.answers.length > 0 ? (
          <div className='overflow-hidden rounded-2xl border bg-white'>
            <div className='p-4 text-sm text-gray-600'>
              Showing {result.answers.length} answer{result.answers.length !== 1 ? 's' : ''}
            </div>
            <Table>
              <TableHeader className='bg-gray-50'>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Name</TableHead>
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Email</TableHead>
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>City</TableHead>
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Answer</TableHead>
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.answers.map((answer, index) => {
                  const hasAnswer = answer.answer && answer.answer.trim().length > 0;
                  const isSuccess = answer.status === 'success' && hasAnswer;

                  return (
                    <TableRow key={answer.id || answer.doc_id || `answer-${index}`} className='hover:bg-gray-50'>
                      <TableCell className='px-4 py-3 text-sm font-medium text-gray-900'>
                        {normalizeValue(answer.name) || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-sm text-gray-700'>
                        {normalizeValue(answer.email) || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-sm text-gray-700'>
                        {normalizeValue(answer.city) || '-'}
                      </TableCell>
                      <TableCell className='px-4 py-3 text-sm text-gray-700'>
                        {isSuccess ? (
                          <div className='max-w-md whitespace-pre-wrap'>{normalizeValue(answer.answer)}</div>
                        ) : (
                          <div className='text-red-600'>{answer.error_message || 'Failed to generate answer'}</div>
                        )}
                      </TableCell>
                      <TableCell className='px-4 py-3'>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {answer.status || 'unknown'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : result.status === 'completed' ? (
          <div className='rounded-2xl border border-yellow-200 bg-yellow-50 p-6'>
            <h3 className='mb-2 text-lg font-semibold text-yellow-900'>No Answers Available</h3>
            <div className='space-y-2 text-sm text-yellow-800'>
              <p>The Q&A session completed but no answers were returned.</p>
              <details className='mt-4'>
                <summary className='cursor-pointer font-medium'>Debug Info (Click to expand)</summary>
                <pre className='mt-2 overflow-auto rounded bg-yellow-100 p-3 text-xs'>
                  {JSON.stringify(
                    {
                      resultId: result.id,
                      status: result.status,
                      answersLength: result.answers?.length || 0,
                      answers: result.answers,
                      hasError: !!error,
                      errorMessage: error?.message,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
