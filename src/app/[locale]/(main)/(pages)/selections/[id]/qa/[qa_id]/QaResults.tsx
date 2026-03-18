'use client';

import { ArrowLeft, ChevronDown, ChevronRight, Download } from 'lucide-react';
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


// SQ3 expand panel — 2-column grid of all fields
const SQ3_FIELD_ORDER = [
  'Company Snapshot',
  'Target Customers & Markets',
  'Organizational Buying Context',
  'Strategic Focus Indicators',
  'Positioning & Differentiation Signals',
  'Commercial Entry Points',
  'Suggested Conversation Angle',
  'Key Website Evidence',
];

const SQ3_MIDDLE_FIELDS = [
  'Target Customers & Markets',
  'Organizational Buying Context',
  'Strategic Focus Indicators',
  'Positioning & Differentiation Signals',
  'Commercial Entry Points',
  'Key Website Evidence',
];

function SQ3FieldValue({ val }: { val: unknown }) {
  if (Array.isArray(val)) {
    return val.length === 0
      ? <span className='text-sm text-gray-400'>—</span>
      : <ul className='list-disc pl-4 text-sm text-gray-700 space-y-0.5'>{val.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
  }
  return <p className='text-sm text-gray-700'>{String(val)}</p>;
}

function SQ3ExpandPanel({ parsed }: { parsed: Record<string, unknown> }) {
  const snapshot = parsed['Company Snapshot'];
  const angle = parsed['Suggested Conversation Angle'];

  return (
    <div className='divide-y divide-gray-200'>
      {snapshot && (
        <div className='px-6 py-4'>
          <p className='mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Company Snapshot</p>
          <p className='text-sm text-gray-700'>{String(snapshot)}</p>
        </div>
      )}
      <div className='grid grid-cols-2 divide-x divide-gray-200'>
        {SQ3_MIDDLE_FIELDS.map((key) => {
          const val = parsed[key];
          if (val === undefined || val === null) return null;
          return (
            <div key={key} className='px-6 py-4 border-b border-gray-200'>
              <p className='mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{key}</p>
              <SQ3FieldValue val={val} />
            </div>
          );
        })}
      </div>
      {angle && (
        <div className='px-6 py-4 bg-blue-50'>
          <p className='mb-1 text-xs font-semibold text-blue-600 uppercase tracking-wide'>Suggested Conversation Angle</p>
          <p className='text-sm text-blue-900'>{String(angle)}</p>
        </div>
      )}
    </div>
  );
}

// Generic expand panel for SQ1/SQ4 — single full-width text block
function SimpleExpandPanel({ label, content }: { label: string; content: string }) {
  return (
    <div className='p-4'>
      <p className='mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide'>{label}</p>
      <p className='whitespace-pre-wrap text-sm text-gray-700'>{content}</p>
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const selectionId = params.id as string;
  const qaId = params.qa_id as string;

  const {
    data: qaResult,
    isLoading,
    error,
    refetch,
  } = useQAResultQuery(selectionId, qaId, {
    enabled: !isCheckingAuth && !!selectionId && !!qaId,
    retry: 1,
  });

  useEffect(() => {
    if (qaResult && qaResult.status === 'completed' && qaResult.answers && qaResult.answers.length === 0) {
      setTimeout(() => { refetch(); }, 2000);
    }
  }, [qaResult, refetch]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(getLocalePath(locale, '/login')); return; }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [router, supabase]);

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const getStatusBadge = (status: string) => {
    const styles = { processing: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800' };
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.open(result.csv_url, '_blank'); return; }
      const { data: downloads, error: downloadError } = await supabase
        .from('downloads').select('id, row_count').eq('user_id', user.id)
        .eq('selection_id', selectionId).eq('type', 'qa')
        .order('created_at', { ascending: false }).limit(1).single<{ id: string; row_count: number }>();
      if (!downloadError && downloads?.id) {
        const response = await fetch(`/api/downloads/${downloads.id}/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) {
          console.error('[QaResults] Failed to log download:', { status: response.status });
        } else {
          const data = await response.json();
          window.open(data.downloadUrl || result.csv_url, '_blank');
          return;
        }
      } else {
        console.warn('[QaResults] Could not find download record:', downloadError);
      }
    } catch (error) {
      console.error('[QaResults] Error calling download API:', error);
    }
    window.open(result.csv_url, '_blank');
  };

  if (isCheckingAuth || isLoading) return <FullPageLoader text='Loading Q&A results...' />;

  const result = qaResult;
  if (!result) return null;

  const sqId = result.standard_question_id ?? null;
  const showCity = result.answers?.some((a) => a.city) ?? false;

  // Per-SQ table structure
  // SQ1: Score column visible, Rationale in expand
  // SQ2: all dimension columns visible, Evidence in expand
  // SQ3: only Company Snapshot visible, all fields in expand
  // SQ4: truncated message visible, full text in expand
  const hasExpandableRows = sqId === '1' || sqId === '2' || sqId === '3' || sqId === '4';

  // For SQ2: dynamic dimension keys (excluding Evidence)
  const sq2DimKeys: string[] = (() => {
    if (sqId !== '2' || !result.answers) return [];
    const first = result.answers.find((a) => a.status === 'success' && a.answer);
    if (!first?.answer) return [];
    try {
      const parsed = JSON.parse(first.answer);
      return Object.keys(parsed).filter((k) => k !== 'Evidence');
    } catch { return []; }
  })();

  const renderExpandPanel = (parsed: Record<string, unknown>, rowSqId: string, colSpan: number) => {
    if (rowSqId === '3') {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='p-0 bg-gray-50 border-b'>
            <SQ3ExpandPanel parsed={parsed} />
          </TableCell>
        </TableRow>
      );
    }
    if (rowSqId === '1') {
      const text = parsed['SCORE_TEXT'];
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='p-0 bg-gray-50 border-b'>
            <SimpleExpandPanel label='Rationale' content={text ? String(text) : '—'} />
          </TableCell>
        </TableRow>
      );
    }
    if (rowSqId === '4') {
      const msg = parsed['message'];
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='p-0 bg-gray-50 border-b'>
            <SimpleExpandPanel label='Full Message' content={msg ? String(msg) : '—'} />
          </TableCell>
        </TableRow>
      );
    }
    if (rowSqId === '2') {
      const evidence = parsed['Evidence'];
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='p-0 bg-gray-50 border-b'>
            <div className='p-4'>
              <p className='mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Evidence</p>
              {Array.isArray(evidence) && evidence.length > 0
                ? <ul className='list-disc pl-4 text-sm text-gray-700'>{evidence.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>
                : <span className='text-sm text-gray-400'>—</span>}
            </div>
          </TableCell>
        </TableRow>
      );
    }
    return null;
  };

  // Column count for colSpan
  const colCount = 1 + (showCity ? 1 : 0) + (hasExpandableRows ? 1 : 0) +
    (sqId === '1' ? 1 : sqId === '2' ? sq2DimKeys.length : sqId === '3' ? 1 : sqId === '4' ? 1 : 1) + 1;

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-6'>
          <Button variant='ghost' className='-ml-2 mb-4 hover:bg-gray-100' onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}`))}>
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
                {result.completed_at && (<><span>•</span><span>Completed: {formatDate(result.completed_at)}</span></>)}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              {getStatusBadge(result.status)}
              {result.status === 'completed' && (
                <div className='flex flex-col items-end gap-1'>
                  <Button className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700' onClick={handleDownloadExcel}>
                    <Download className='mr-2 h-4 w-4' />
                    Download Excel
                  </Button>
                  {downloadNote && <span className='text-xs text-gray-500'>{downloadNote}</span>}
                </div>
              )}
              {result.status === 'failed' && (
                <Button className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700' onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}`))}>
                  Generate Answers Again
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className='mb-6 rounded-2xl border bg-white p-6'>
          <h2 className='mb-2 font-semibold text-gray-900'>Question</h2>
          <p className='text-gray-700'>{result.prompt}</p>
        </div>

        {(error || result.status === 'failed') && (
          <div className='mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3'>
            <svg className='mt-0.5 h-4 w-4 shrink-0 text-red-500' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z' clipRule='evenodd' />
            </svg>
            <div className='text-sm text-red-800'>
              {error ? (error.message || 'Failed to load Q&A results') : (result.error_message || 'Processing failed. Please try again.')}
            </div>
          </div>
        )}

        {result.status === 'processing' && (
          <div className='mb-6'>
            <SQLoader sqId={result.standard_question_id} progress={result.progress} startedAt={result.created_at} totalItems={result.total_items} />
          </div>
        )}

        {result.answers && Array.isArray(result.answers) && result.answers.length > 0 ? (
          <div className='overflow-x-auto overflow-hidden rounded-2xl border bg-white'>
            <div className='p-4 text-sm text-gray-600'>
              Showing {result.answers.length} answer{result.answers.length !== 1 ? 's' : ''}
            </div>
            <Table className='table-fixed'>
              <colgroup>
                {hasExpandableRows && <col className='w-10' />}
                <col className={showCity ? 'w-[25%]' : 'w-[30%]'} />
                {showCity && <col className='w-[15%]' />}
                {sqId === '1' && <col className='w-20' />}
                {sqId === '2' && sq2DimKeys.map((k) => <col key={k} />)}
                {(sqId === '3' || sqId === '4' || !sqId) && <col />}
                <col className='w-24' />
              </colgroup>
              <TableHeader className='bg-gray-50'>
                <TableRow className='hover:bg-transparent'>
                  {hasExpandableRows && <TableHead className='w-10 px-3 py-3' />}
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Name</TableHead>
                  {showCity && <TableHead className='px-4 py-3 font-semibold text-gray-700'>City</TableHead>}
                  {sqId === '1' && <TableHead className='w-20 px-4 py-3 font-semibold text-gray-700'>Score</TableHead>}
                  {sqId === '2' && sq2DimKeys.map((k) => (
                    <TableHead key={k} className='px-4 py-3 font-semibold text-gray-700'>{k}</TableHead>
                  ))}
                  {sqId === '3' && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Company Snapshot</TableHead>}
                  {sqId === '4' && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Message</TableHead>}
                  {!sqId && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Answer</TableHead>}
                  <TableHead className='px-4 py-3 font-semibold text-gray-700'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.answers.map((answer, index) => {
                  const rowId = answer.id || answer.doc_id || `answer-${index}`;
                  const hasAnswer = answer.answer && answer.answer.trim().length > 0;
                  const isSuccess = answer.status === 'success' && hasAnswer;
                  const isExpanded = expandedRows.has(rowId);

                  let parsedAnswer: Record<string, unknown> | null = null;
                  if (isSuccess && sqId && answer.answer) {
                    try { parsedAnswer = JSON.parse(answer.answer); } catch { /* keep null */ }
                  }

                  return (
                    <React.Fragment key={rowId}>
                      <TableRow
                        className={`hover:bg-gray-50 ${hasExpandableRows && isSuccess ? 'cursor-pointer' : ''}`}
                        onClick={() => hasExpandableRows && isSuccess && toggleRow(rowId)}
                      >
                        {hasExpandableRows && (
                          <TableCell className='w-10 px-3 py-3 text-gray-400'>
                            {isSuccess
                              ? (isExpanded ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />)
                              : null}
                          </TableCell>
                        )}
                        <TableCell className='px-4 py-3 text-sm font-medium text-gray-900'>
                          {normalizeValue(answer.name) || '-'}
                        </TableCell>
                        {showCity && (
                          <TableCell className='px-4 py-3 text-sm text-gray-700'>
                            {normalizeValue(answer.city) || '-'}
                          </TableCell>
                        )}
                        {sqId === '1' && (
                          <TableCell className='px-4 py-3'>
                            {isSuccess && parsedAnswer ? (() => {
                              const v = String(parsedAnswer['SCORE_VALUE'] ?? '');
                              if (v === 'NULL' || v === 'null' || v === '') return <span className='text-xs text-gray-400 italic'>N/A</span>;
                              const n = parseFloat(v);
                              const scoreColor = n >= 4 ? 'bg-green-100 text-green-800' : n >= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                              return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor}`}>{v}/5</span>;
                            })() : <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>}
                          </TableCell>
                        )}
                        {sqId === '2' && sq2DimKeys.map((k) => (
                          <TableCell key={k} className='px-4 py-3 text-sm text-gray-700'>
                            {isSuccess && parsedAnswer
                              ? <span>{String(parsedAnswer[k] ?? '—')}</span>
                              : <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>}
                          </TableCell>
                        ))}
                        {sqId === '3' && (
                          <TableCell className='px-4 py-3 text-sm text-gray-700'>
                            {isSuccess && parsedAnswer
                              ? <span className='line-clamp-2'>{String(parsedAnswer['Company Snapshot'] ?? '—')}</span>
                              : <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>}
                          </TableCell>
                        )}
                        {sqId === '4' && (
                          <TableCell className='px-4 py-3 text-sm text-gray-700'>
                            {isSuccess && parsedAnswer
                              ? <span className='line-clamp-2'>{String(parsedAnswer['message'] ?? '—')}</span>
                              : <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>}
                          </TableCell>
                        )}
                        {!sqId && (
                          <TableCell className='px-4 py-3 text-sm text-gray-700'>
                            {isSuccess
                              ? <div className='max-w-md whitespace-pre-wrap'>{normalizeValue(answer.answer)}</div>
                              : <span className='text-sm text-red-600'>{answer.error_message || 'Failed to generate answer'}</span>}
                          </TableCell>
                        )}
                        <TableCell className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {answer.status || 'unknown'}
                          </span>
                        </TableCell>
                      </TableRow>
                      {isExpanded && isSuccess && parsedAnswer && sqId &&
                        renderExpandPanel(parsedAnswer, sqId, colCount)}
                    </React.Fragment>
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
