'use client';

import { ArrowLeft, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { useQAResultQuery } from '@/libs/queries';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import { FullPageLoader } from '@/components/full-page-loader';
import { SQLoader } from '@/components/selection/sq-loading';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getLocalePath } from '@/utils/get-locale-path';
import { normalizeValue } from '@/utils/normalize-value';



function ExpandableList({ items, preview = 2 }: { items: string[]; preview?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, preview);
  const hidden = items.length - preview;
  return (
    <div>
      <ul className='list-disc pl-4 text-xs text-gray-500'>
        {visible.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      {!expanded && hidden > 0 && (
        <div className='mt-1 flex justify-center'>
          <button
            className='rounded bg-gray-600 px-5 py-1 text-xs font-medium text-white hover:bg-gray-700'
            onClick={() => setExpanded(true)}
          >
            +{hidden} more
          </button>
        </div>
      )}
      {expanded && items.length > preview && (
        <div className='mt-1 flex justify-center'>
          <button
            className='rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300'
            onClick={() => setExpanded(false)}
          >
            show less
          </button>
        </div>
      )}
    </div>
  );
}

export function QaResults() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'uk';
  const supabase = createSupabaseBrowserClient();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);
  const selectionId = params.id as string;
  const qaId = params.qa_id as string;

  // Use TanStack Query with automatic polling for processing status
  const {
    data: qaResult,
    isLoading,
    error,
    refetch,
  } = useQAResultQuery(selectionId, qaId, {
    enabled: !isCheckingAuth && !!selectionId && !!qaId,
    retry: 1,
  });

  // Auto-refetch when completed but no answers (in case answers were just saved)
  useEffect(() => {
    if (qaResult && qaResult.status === 'completed' && qaResult.answers && qaResult.answers.length === 0) {
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [qaResult, refetch]);

  /**
   * Render the answer cell content.
   * For standard questions the answer is JSON — render key fields inline.
   */
  const renderAnswer = (answer: { answer: string }, sqId?: string | null) => {
    const raw = answer.answer;
    if (!raw || raw.trim().length === 0) {
      return <span className='text-gray-400 italic'>No answer</span>;
    }

    if (sqId) {
      try {
        const parsed = JSON.parse(raw);

        if (sqId === '1') {
          return (
            <div className='space-y-1 text-sm'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold text-gray-900'>Score:</span>
                <span className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800'>
                  {parsed.SCORE_VALUE ?? '—'}/5
                </span>
              </div>
              <p className='max-w-xs text-gray-600'>{parsed.SCORE_TEXT}</p>
            </div>
          );
        }

        if (sqId === '2') {
          const { Evidence, ...dims } = parsed;
          return (
            <div className='space-y-1 text-sm'>
              {Object.entries(dims).map(([k, v]) => (
                <div key={k} className='flex gap-1'>
                  <span className='font-semibold text-gray-700'>{k}:</span>
                  <span className='text-gray-600'>{String(v)}</span>
                </div>
              ))}
              {Array.isArray(Evidence) && Evidence.length > 0 && (
                <div className='mt-1'>
                  <ExpandableList items={Evidence} preview={2} />
                </div>
              )}
            </div>
          );
        }

        if (sqId === '3') {
          return (
            <div className='space-y-1 text-sm'>
              {parsed['Company Snapshot'] && (
                <p className='text-gray-700'>{parsed['Company Snapshot']}</p>
              )}
              {parsed['Suggested Conversation Angle'] && (
                <p className='mt-1 italic text-blue-700'>{parsed['Suggested Conversation Angle']}</p>
              )}
              {!parsed['Company Snapshot'] && !parsed['Suggested Conversation Angle'] && (
                <span className='text-gray-400 italic'>Incomplete response</span>
              )}
            </div>
          );
        }

        if (sqId === '4') {
          return (
            <div className='max-w-sm whitespace-pre-wrap text-sm text-gray-700'>
              {parsed.message || <span className='text-gray-400 italic'>No message</span>}
            </div>
          );
        }
      } catch {
        // JSON parse fai;ed — fall through to raw display
      }
    }

    // Legacy / non-standard: plain text
    return <div className='max-w-md whitespace-pre-wrap text-sm'>{normalizeValue(raw)}</div>;
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


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
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

  const handleDownloadExcel = async () => {
    if (!result?.csv_url || result.csv_url === '#') {
      setDownloadNote('Excel download will be available soon');
      return;
    }
    setDownloadNote(null);

    // First, find the download record for this Q&A session
    // Trigger Inngest background job to generate and upload Excel
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

  if (isCheckingAuth || isLoading) return <FullPageLoader text='Loading Q&A results...' />;

  const result = qaResult;

  if (!result) {
    return null;
  }

  // Build dynamic columns from the first successfully parsed answer
  const sqId = result.standard_question_id ?? null;

  // Identity columns always present
  const showEmail = result.answers?.some((a) => a.email) ?? false;
  const showCity = result.answers?.some((a) => a.city) ?? false;

  // Extract JSON answer keys from the first successful answer to drive dynamic columns
  const dynamicKeys: string[] = (() => {
    if (!sqId || !result.answers) return [];
    const firstSuccess = result.answers.find((a) => a.status === 'success' && a.answer);
    if (!firstSuccess?.answer) return [];
    try {
      const parsed = JSON.parse(firstSuccess.answer);
      return Object.keys(parsed);
    } catch {
      return [];
    }
  })();

  // Render a single dynamic cell value
  const renderCellValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className='text-gray-300'>—</span>;
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className='text-gray-300'>—</span>;
      return <ExpandableList items={value.map(String)} />;
    }
    return <span className='text-sm text-gray-700'>{String(value)}</span>;
  };

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
                <div className='flex flex-col items-end gap-1'>
                  <Button
                    className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                    onClick={handleDownloadExcel}
                  >
                    <Download className='mr-2 h-4 w-4' />
                    Download Excel
                  </Button>
                  {downloadNote && (
                    <span className='text-xs text-gray-500'>{downloadNote}</span>
                  )}
                </div>
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
        </div>

        {/* §5.5 Inline error — shown above results, no modal */}
        {(error || result.status === 'failed') && (
          <div className='mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3'>
            <svg className='mt-0.5 h-4 w-4 shrink-0 text-red-500' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z' clipRule='evenodd' />
            </svg>
            <div className='text-sm text-red-800'>
              {error
                ? (error.message || 'Failed to load Q&A results')
                : (result.error_message || 'Processing failed. Please try again.')}
            </div>
          </div>
        )}

        {/* §5.4 Loading component — shown while processing and no answers yet */}
        {result.status === 'processing' && !(result.answers && result.answers.length > 0) && (
          <div className='mb-6'>
            <SQLoader sqId={result.standard_question_id} progress={result.progress} startedAt={result.created_at} totalItems={result.total_items} />
          </div>
        )}

        {/* §5.3 Results Table — columns built dynamically from backend response */}
        {result.answers && Array.isArray(result.answers) && result.answers.length > 0 ? (
          <div className='overflow-x-auto overflow-hidden rounded-2xl border bg-white'>
            <div className='p-4 text-sm text-gray-600'>
              Showing {result.answers.length} answer{result.answers.length !== 1 ? 's' : ''}
            </div>
            <Table>
              <TableHeader className='bg-gray-50'>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Name</TableHead>
                  {showEmail && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Email</TableHead>}
                  {showCity && <TableHead className='px-4 py-3 font-semibold text-gray-700'>City</TableHead>}
                  {dynamicKeys.map((key) => (
                    <TableHead key={key} className={`px-4 py-3 font-semibold text-gray-700${key === 'Evidence' ? ' min-w-[260px]' : ''}`}>{key}</TableHead>
                  ))}
                  {dynamicKeys.length === 0 && (
                    <TableHead className='px-4 py-3 font-semibold text-gray-700'>Answer</TableHead>
                  )}
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.answers.map((answer, index) => {
                  const hasAnswer = answer.answer && answer.answer.trim().length > 0;
                  const isSuccess = answer.status === 'success' && hasAnswer;

                  // Parse JSON once per row for dynamic columns
                  let parsedAnswer: Record<string, unknown> | null = null;
                  if (isSuccess && dynamicKeys.length > 0 && answer.answer) {
                    try { parsedAnswer = JSON.parse(answer.answer); } catch { /* keep null */ }
                  }

                  return (
                    <TableRow key={answer.id || answer.doc_id || `answer-${index}`} className='hover:bg-gray-50'>
                      <TableCell className='px-4 py-3 text-sm font-medium text-gray-900'>
                        {normalizeValue(answer.name) || '-'}
                      </TableCell>
                      {showEmail && (
                        <TableCell className='px-4 py-3 text-sm text-gray-700'>
                          {normalizeValue(answer.email) || '-'}
                        </TableCell>
                      )}
                      {showCity && (
                        <TableCell className='px-4 py-3 text-sm text-gray-700'>
                          {normalizeValue(answer.city) || '-'}
                        </TableCell>
                      )}
                      {dynamicKeys.length > 0 ? (
                        dynamicKeys.map((key) => (
                          <TableCell key={key} className='px-4 py-3 align-top'>
                            {isSuccess && parsedAnswer
                              ? renderCellValue(parsedAnswer[key])
                              : <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>}
                          </TableCell>
                        ))
                      ) : (
                        <TableCell className='px-4 py-3 text-sm text-gray-700'>
                          {isSuccess
                            ? renderAnswer(answer, sqId)
                            : <span className='text-sm text-red-600'>{answer.error_message || 'Failed to generate answer'}</span>}
                        </TableCell>
                      )}
                      <TableCell className='px-4 py-3'>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
