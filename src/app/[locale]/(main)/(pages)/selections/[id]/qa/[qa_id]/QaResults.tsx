'use client';

import { ArrowLeft, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { parseCustomAnswer } from '@/libs/parse-custom';
import { resolveQaDownloadUrl } from '@/libs/qa-download';
import { parseSq1Score } from '@/libs/qa-output-schemas';
import { useQAResultQuery } from '@/libs/queries';
import { createSupabaseBrowserClient } from '@/libs/supabase/supabase-browser-client';

import { FullPageLoader } from '@/components/full-page-loader';
import { SQLoader } from '@/components/selection/sq-loading';
import { TopScrollbar, useSyncedTopScrollbar } from '@/components/selection/synced-scroll';
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

function SQ3FieldValue({ val }: { val: string | string[] }) {
  if (Array.isArray(val)) {
    return val.length === 0 ? (
      <span className='text-sm text-gray-400'>—</span>
    ) : (
      <ul className='list-disc space-y-0.5 pl-4 text-sm text-gray-700'>
        {val.map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ul>
    );
  }
  return <p className='text-sm text-gray-700'>{String(val)}</p>;
}

function SQ3ExpandPanel({ parsed }: { parsed: Record<string, unknown> }) {
  const snapshot = parsed['Company Snapshot'] as string | undefined;
  const angle = parsed['Suggested Conversation Angle'] as string | undefined;

  return (
    <div className='divide-y divide-gray-200'>
      {snapshot && (
        <div className='px-4 py-3 sm:px-6 sm:py-4'>
          <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500'>Company Snapshot</p>
          <p className='text-sm text-gray-700'>{String(snapshot)}</p>
        </div>
      )}
      <div className='grid grid-cols-1 divide-gray-200 sm:grid-cols-2 sm:divide-x'>
        {SQ3_MIDDLE_FIELDS.map((key) => {
          const val = parsed[key];
          if (val === undefined || val === null) return null;
          return (
            <div key={key} className='border-b border-gray-200 px-4 py-3 sm:border-b sm:px-6 sm:py-4'>
              <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500'>{key}</p>
              <SQ3FieldValue val={val as string | string[]} />
            </div>
          );
        })}
      </div>
      {angle && (
        <div className='bg-blue-50 px-4 py-3 sm:px-6 sm:py-4'>
          <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600'>
            Suggested Conversation Angle
          </p>
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
      <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500'>{label}</p>
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
  const [sq1Scores, setSq1Scores] = useState<number[]>([]);
  const [sq1Asc, setSq1Asc] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [showInputSnapshot, setShowInputSnapshot] = useState(false);
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
  const { topRef, mainRef, spacerRef } = useSyncedTopScrollbar([qaResult?.answers?.length ?? 0]);

  useEffect(() => {
    if (qaResult && qaResult.status === 'completed' && qaResult.answers && qaResult.answers.length === 0) {
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [qaResult, refetch]);

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

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

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
    const directUrl = resolveQaDownloadUrl(result?.csv_url);
    if (directUrl) {
      setDownloadNote(null);
      window.open(directUrl, '_blank');
      return;
    }
    setDownloadNote(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDownloadNote('Excel download will be available soon');
        return;
      }
      const { data: downloads, error: downloadError } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', user.id)
        .eq('selection_id', selectionId)
        .eq('type', 'qa')
        .order('created_at', { ascending: false })
        .limit(1)
        .single<{ id: string }>();
      if (!downloadError && downloads?.id) {
        const response = await fetch(`/api/downloads/${downloads.id}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          console.error('[QaResults] Failed to log download:', { status: response.status });
        } else {
          const data = await response.json();
          if (data.downloadUrl) {
            window.open(data.downloadUrl, '_blank');
            return;
          }
        }
      } else {
        console.warn('[QaResults] Could not find download record:', downloadError);
      }
    } catch (error) {
      console.error('[QaResults] Error calling download API:', error);
    }
    setDownloadNote('Excel download will be available soon');
  };

  if (isCheckingAuth || isLoading) return <FullPageLoader text='Loading insights...' />;

  const result = qaResult;
  if (!result) return null;

  const sqId = result.standard_question_id ?? null;
  const showCity = result.answers?.some((a) => a.city) ?? false;
  const isCustomQa = !sqId;

  // Per-SQ table structure
  // SQ1: Score column visible, Rationale in expand
  // SQ2: all dimension columns visible, Evidence in expand
  // SQ3: only Company Snapshot visible, all fields in expand
  // SQ4: truncated message visible, full text in expand
  const hasExpandableRows = sqId === '1' || sqId === '2' || sqId === '3' || sqId === '4';

  // For SQ2: union of dimension keys (excluding Evidence) across ALL successful rows,
  // so columns stay stable even when an early row is missing a dimension.
  const sq2AllDimKeys: string[] = (() => {
    if (sqId !== '2' || !result.answers) return [];
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const a of result.answers) {
      if (a.status !== 'success' || !a.answer) continue;
      try {
        const parsed = JSON.parse(a.answer);
        for (const k of Object.keys(parsed)) {
          if (k === 'Evidence' || seen.has(k)) continue;
          seen.add(k);
          ordered.push(k);
        }
      } catch {
        // skip unparseable rows
      }
    }
    return ordered;
  })();

  const sq2DimKeys = sq2AllDimKeys;
  const sq2ExpandKeys: string[] = [];

  const getSQ1Score = (answer: { answer: string | null; status: string }): number | null => {
    if (answer.status !== 'success' || !answer.answer) return null;
    try {
      const parsed = JSON.parse(answer.answer) as Record<string, unknown>;
      return parseSq1Score(parsed['SCORE_VALUE']);
    } catch {
      return null;
    }
  };

  const visibleAnswers = (() => {
    if (sqId !== '1' || !result.answers) return result.answers ?? [];
    const filtered =
      sq1Scores.length === 0
        ? [...result.answers]
        : result.answers.filter((a) => {
            const s = getSQ1Score(a);
            return s !== null && sq1Scores.includes(s);
          });
    return filtered.sort((a, b) => {
      const sa = getSQ1Score(a) ?? (sq1Asc ? 6 : 0);
      const sb = getSQ1Score(b) ?? (sq1Asc ? 6 : 0);
      return sq1Asc ? sa - sb : sb - sa;
    });
  })();

  const toggleSq1Score = (score: number) => {
    setSq1Scores((prev) => (prev.includes(score) ? prev.filter((s) => s !== score) : [...prev, score]));
  };

  const handleFollowUp = async () => {
    if (sq1Scores.length === 0 || visibleAnswers.length === 0 || isCreatingFollowUp) return;
    setIsCreatingFollowUp(true);
    setFollowUpError(null);
    try {
      const response = await fetch(`/api/selections/${selectionId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: sq1Scores, sourceQaSessionId: qaId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.newSelectionId) {
        setFollowUpError(data.error || 'Failed to create follow-up selection');
        setIsCreatingFollowUp(false);
        return;
      }
      router.push(getLocalePath(locale, `/selections/${data.newSelectionId}`));
    } catch {
      setFollowUpError('Failed to create follow-up selection');
      setIsCreatingFollowUp(false);
    }
  };

  const renderExpandPanel = (
    parsed: Record<string, unknown>,
    rowSqId: string,
    colSpan: number,
    extraKeys: string[] = []
  ) => {
    if (rowSqId === '3') {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='border-b bg-gray-50 p-0'>
            <SQ3ExpandPanel parsed={parsed} />
          </TableCell>
        </TableRow>
      );
    }
    if (rowSqId === '1') {
      const raw = parsed['SCORE_TEXT'] ? String(parsed['SCORE_TEXT']) : '—';
      const text = raw.replace(/^Score\s*\d+\s*:\s*/i, '').replace(/^(Score\s*)?(NULL|null)\s*:\s*/i, '');
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='border-b bg-gray-50 p-0'>
            <SimpleExpandPanel label='Rationale' content={text || '—'} />
          </TableCell>
        </TableRow>
      );
    }
    if (rowSqId === '4') {
      const msg = parsed['message'];
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='border-b bg-gray-50 p-0'>
            <SimpleExpandPanel label='Full Message' content={msg ? String(msg) : '—'} />
          </TableCell>
        </TableRow>
      );
    }
    if (rowSqId === '2') {
      const evidence = parsed['Evidence'];
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className='border-b bg-gray-50 p-0'>
            <div className='divide-y divide-gray-200'>
              {extraKeys.length > 0 && (
                <div className='flex flex-col divide-gray-200 sm:flex-row sm:divide-x'>
                  {extraKeys.map((k) => (
                    <div
                      key={k}
                      className='flex-1 border-b border-gray-200 px-4 py-3 last:border-b-0 sm:border-b-0 sm:px-6'
                    >
                      <p className='mb-0.5 break-words text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        {k}
                      </p>
                      <p className='break-words text-sm text-gray-700'>{String(parsed[k] ?? '—')}</p>
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(evidence) && evidence.length > 0 && (
                <div className='px-4 py-3 sm:px-6'>
                  <p className='mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500'>Evidence</p>
                  <ul className='list-disc pl-4 text-sm text-gray-700'>
                    {evidence.map((v, i) => (
                      <li key={i}>{String(v)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    }
    return null;
  };

  // Column count for colSpan
  const colCount =
    1 +
    (showCity ? 1 : 0) +
    (hasExpandableRows ? 1 : 0) +
    (sqId === '1' ? 2 : sqId === '2' ? sq2DimKeys.length : sqId === '3' ? 1 : sqId === '4' ? 1 : 2) +
    1;

  return (
    <div className='min-h-screen bg-gray-50 p-4 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-6'>
          <Button
            variant='ghost'
            className='-ml-2 mb-4 hover:bg-gray-100'
            onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}`))}
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Selection
          </Button>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <h1 className='text-2xl font-bold text-black sm:text-3xl'>Insights Results</h1>
              <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600'>
                <span className='min-w-0 break-words'>{result.selection_name}</span>
                <span className='hidden sm:inline'>•</span>
                <span>Created: {formatDate(result.created_at)}</span>
                {result.completed_at && (
                  <>
                    <span className='hidden sm:inline'>•</span>
                    <span>Completed: {formatDate(result.completed_at)}</span>
                  </>
                )}
              </div>
            </div>
            <div className='flex flex-col gap-3 sm:items-end'>
              {getStatusBadge(result.status)}
              {result.status === 'completed' && (
                <div className='flex flex-col items-stretch gap-1 sm:items-end'>
                  <Button
                    className='w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto'
                    onClick={handleDownloadExcel}
                  >
                    <Download className='mr-2 h-4 w-4 shrink-0' />
                    Download Excel
                  </Button>
                  {downloadNote && <span className='text-xs text-gray-500'>{downloadNote}</span>}
                </div>
              )}
              {result.status === 'failed' && (
                <Button
                  className='w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto'
                  onClick={() => router.push(getLocalePath(locale, `/selections/${params.id}`))}
                >
                  Run Again
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className='mb-6 rounded-2xl border bg-white p-4 sm:p-6'>
          <h2 className='mb-2 font-semibold text-gray-900'>Question</h2>
          <p className='break-words text-gray-700'>{result.prompt}</p>
          {result.input_snapshot &&
          Array.isArray(result.input_snapshot.fields) &&
          result.input_snapshot.fields.length > 0 ? (
            <div className='mt-3 border-t border-gray-100 pt-3'>
              <button
                type='button'
                className='text-sm font-medium text-gray-600 transition-colors hover:text-gray-900'
                onClick={() => setShowInputSnapshot((v) => !v)}
              >
                View analysis input {showInputSnapshot ? '▴' : '▾'}
              </button>
              {showInputSnapshot && (
                <dl className='mt-3 space-y-3'>
                  {[...result.input_snapshot.fields]
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <div key={field.key}>
                        <dt className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{field.label}</dt>
                        <dd className='mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-700'>
                          {field.value === null || field.value === undefined || field.value === ''
                            ? '—'
                            : Array.isArray(field.value)
                            ? field.value.map(String).join(', ')
                            : typeof field.value === 'boolean'
                            ? field.value
                              ? 'Yes'
                              : 'No'
                            : String(field.value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              )}
            </div>
          ) : null}
        </div>

        {(error || result.status === 'failed') && (
          <div className='mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3'>
            <svg className='mt-0.5 h-4 w-4 shrink-0 text-red-500' viewBox='0 0 20 20' fill='currentColor'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-9.25a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z'
                clipRule='evenodd'
              />
            </svg>
            <div className='text-sm text-red-800'>
              {error
                ? error.message || 'Failed to load insights'
                : result.error_message || 'Processing failed. Please try again.'}
            </div>
          </div>
        )}

        {result.status === 'processing' && (
          <div className='mb-6'>
            <SQLoader
              sqId={result.standard_question_id}
              progress={result.progress}
              startedAt={result.created_at}
              totalItems={result.total_items}
            />
          </div>
        )}

        {result.answers && Array.isArray(result.answers) && result.answers.length > 0 ? (
          <>
            {sqId === '1' && (
              <div className='mb-4 rounded-2xl border bg-white p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='mr-1 text-sm font-medium text-gray-700'>Scores</span>
                  <button
                    type='button'
                    onClick={() => setSq1Scores([])}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      sq1Scores.length === 0
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    All
                  </button>
                  {[5, 4, 3, 2, 1].map((s) => {
                    const active = sq1Scores.includes(s);
                    const activeTone =
                      s >= 4
                        ? 'border-green-300 bg-green-100 text-green-800'
                        : s === 3
                        ? 'border-yellow-300 bg-yellow-100 text-yellow-800'
                        : 'border-red-300 bg-red-100 text-red-800';
                    return (
                      <button
                        key={s}
                        type='button'
                        onClick={() => toggleSq1Score(s)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                          active ? activeTone : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {active ? `✓ ${s}/5` : `${s}/5`}
                      </button>
                    );
                  })}
                  <button
                    type='button'
                    onClick={() =>
                      setSq1Scores((prev) =>
                        [3, 4, 5].every((s) => prev.includes(s)) && prev.length === 3 ? [] : [3, 4, 5]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      [3, 4, 5].every((s) => sq1Scores.includes(s)) && sq1Scores.length === 3
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    3+
                  </button>
                  <span className='ml-auto text-sm text-gray-600'>
                    {sq1Scores.length === 0 ? result.answers.length : visibleAnswers.length} companies
                  </span>
                </div>
                {sq1Scores.length > 0 && (
                  <div className='mt-3 flex flex-wrap items-center gap-3'>
                    <Button
                      className='w-full whitespace-normal rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto sm:whitespace-nowrap'
                      onClick={handleFollowUp}
                      disabled={isCreatingFollowUp || visibleAnswers.length === 0}
                    >
                      {isCreatingFollowUp
                        ? 'Creating…'
                        : `Run follow-up analysis on ${visibleAnswers.length} companies →`}
                    </Button>
                    {followUpError && <span className='text-sm text-red-600'>{followUpError}</span>}
                  </div>
                )}
              </div>
            )}
            <div className='overflow-hidden rounded-2xl border bg-white'>
              <TopScrollbar topRef={topRef} spacerRef={spacerRef} />
              <div ref={mainRef} className='overflow-x-auto'>
                <div className='p-4 text-sm text-gray-600'>
                  Showing {sqId === '1' ? visibleAnswers.length : result.answers.length} answer
                  {(sqId === '1' ? visibleAnswers.length : result.answers.length) !== 1 ? 's' : ''}
                </div>
                <Table className={isCustomQa ? 'min-w-[1400px] table-fixed' : sqId === '2' ? '' : 'table-fixed'}>
                  <colgroup>
                    {hasExpandableRows && <col className='w-10' />}
                    <col className={isCustomQa ? 'w-[12%]' : showCity ? 'w-[25%]' : 'w-[30%]'} />
                    {showCity && <col className={isCustomQa ? 'w-[10%]' : 'w-[15%]'} />}
                    {sqId === '1' && <col className='w-20' />}
                    {sqId === '1' && <col />}
                    {sqId === '2' && sq2DimKeys.map((k) => <col key={k} />)}
                    {(sqId === '3' || sqId === '4') && <col />}
                    {!sqId && <col className='w-[24%]' />}
                    {!sqId && <col className='w-[24%]' />}
                    <col className={isCustomQa ? 'w-[6%]' : 'w-24'} />
                  </colgroup>
                  <TableHeader className='bg-gray-50'>
                    <TableRow className='hover:bg-transparent'>
                      {hasExpandableRows && <TableHead className='w-10 px-3 py-3' />}
                      <TableHead className='px-4 py-3 font-semibold text-gray-700'>Name</TableHead>
                      {showCity && <TableHead className='px-4 py-3 font-semibold text-gray-700'>City</TableHead>}
                      {sqId === '1' && (
                        <TableHead
                          className='w-24 cursor-pointer whitespace-nowrap px-4 py-3 font-semibold text-gray-700 hover:bg-gray-100'
                          onClick={() => setSq1Asc((v) => !v)}
                        >
                          Score {sq1Asc ? '↑' : '↓'}
                        </TableHead>
                      )}
                      {sqId === '1' && (
                        <TableHead className='px-4 py-3 font-semibold text-gray-700'>Rationale</TableHead>
                      )}
                      {sqId === '2' &&
                        sq2DimKeys.map((k) => (
                          <TableHead key={k} className='px-4 py-3 font-semibold text-gray-700'>
                            {k}
                          </TableHead>
                        ))}
                      {sqId === '3' && (
                        <TableHead className='px-4 py-3 font-semibold text-gray-700'>Company Snapshot</TableHead>
                      )}
                      {sqId === '4' && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Message</TableHead>}
                      {!sqId && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Answer</TableHead>}
                      {!sqId && <TableHead className='px-4 py-3 font-semibold text-gray-700'>Evidence</TableHead>}
                      <TableHead className='px-4 py-3 font-semibold text-gray-700'>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sqId === '1' ? visibleAnswers : result.answers).map((answer, index) => {
                      const rowId = answer.id || answer.doc_id || `answer-${index}`;
                      const hasAnswer = answer.answer && answer.answer.trim().length > 0;
                      const isSuccess = answer.status === 'success' && hasAnswer;
                      const isExpanded = expandedRows.has(rowId);

                      let parsedAnswer: Record<string, unknown> | null = null;
                      if (isSuccess && sqId && answer.answer) {
                        try {
                          parsedAnswer = JSON.parse(answer.answer);
                        } catch {
                          /* keep null */
                        }
                      }

                      return (
                        <React.Fragment key={rowId}>
                          <TableRow
                            className={`hover:bg-gray-50 ${hasExpandableRows && isSuccess ? 'cursor-pointer' : ''}`}
                            onClick={() => hasExpandableRows && isSuccess && toggleRow(rowId)}
                          >
                            {hasExpandableRows && (
                              <TableCell className='w-10 px-3 py-3 text-gray-400'>
                                {isSuccess ? (
                                  isExpanded ? (
                                    <ChevronDown className='h-4 w-4' />
                                  ) : (
                                    <ChevronRight className='h-4 w-4' />
                                  )
                                ) : null}
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
                                {isSuccess && parsedAnswer ? (
                                  (() => {
                                    const n = parseSq1Score(parsedAnswer['SCORE_VALUE']);
                                    if (n === null) return <span className='text-xs italic text-gray-400'>N/A</span>;
                                    const scoreColor =
                                      n >= 4
                                        ? 'bg-green-100 text-green-800'
                                        : n >= 3
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800';
                                    return (
                                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor}`}>
                                        {n}/5
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>
                                )}
                              </TableCell>
                            )}
                            {sqId === '1' && (
                              <TableCell className='px-4 py-3 text-sm text-gray-700'>
                                {isSuccess && parsedAnswer
                                  ? (() => {
                                      const raw = String(parsedAnswer['SCORE_TEXT'] ?? '');
                                      const text = raw
                                        .replace(/^Score\s*\d+\s*:\s*/i, '')
                                        .replace(/^(Score\s*)?(NULL|null)\s*:\s*/i, '');
                                      if (!text) return <span className='text-gray-400'>—</span>;
                                      const truncated = text.length > 100 ? text.slice(0, 100) + '…' : text;
                                      return <span className='line-clamp-2'>{truncated}</span>;
                                    })()
                                  : null}
                              </TableCell>
                            )}
                            {sqId === '2' &&
                              sq2DimKeys.map((k) => (
                                <TableCell key={k} className='px-4 py-3 text-sm text-gray-700'>
                                  {isSuccess && parsedAnswer ? (
                                    <span className='line-clamp-4 break-words'>{String(parsedAnswer[k] ?? '—')}</span>
                                  ) : (
                                    <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>
                                  )}
                                </TableCell>
                              ))}
                            {sqId === '3' && (
                              <TableCell className='px-4 py-3 text-sm text-gray-700'>
                                {isSuccess && parsedAnswer ? (
                                  <div>
                                    <span className='line-clamp-2'>
                                      {String(parsedAnswer['Company Snapshot'] ?? '—')}
                                    </span>
                                    <span className='mt-0.5 block text-xs text-blue-500'>View full brief →</span>
                                  </div>
                                ) : (
                                  <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>
                                )}
                              </TableCell>
                            )}
                            {sqId === '4' && (
                              <TableCell className='px-4 py-3 text-sm text-gray-700'>
                                {isSuccess && parsedAnswer ? (
                                  <span className='line-clamp-2'>{String(parsedAnswer['message'] ?? '—')}</span>
                                ) : (
                                  <span className='text-xs text-red-500'>{answer.error_message || 'failed'}</span>
                                )}
                              </TableCell>
                            )}
                            {!sqId &&
                              (() => {
                                const parsed = isSuccess && answer.answer ? parseCustomAnswer(answer.answer) : null;
                                return (
                                  <>
                                    <TableCell className='px-4 py-3 text-sm text-gray-700'>
                                      {parsed ? (
                                        <div className='max-w-md whitespace-pre-wrap break-words'>{parsed.answer}</div>
                                      ) : (
                                        <span className='text-sm text-red-600'>
                                          {answer.error_message || 'Failed to generate answer'}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className='px-4 py-3 text-sm text-gray-700'>
                                      {parsed ? (
                                        <div className='max-w-md whitespace-pre-wrap break-words'>
                                          {parsed.evidence || '—'}
                                        </div>
                                      ) : null}
                                    </TableCell>
                                  </>
                                );
                              })()}
                            <TableCell className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                              {isSuccess ? (
                                <span className='text-base font-bold text-green-600'>✓</span>
                              ) : (
                                <span className='rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800'>
                                  {answer.status || 'unknown'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded &&
                            isSuccess &&
                            parsedAnswer &&
                            sqId &&
                            renderExpandPanel(parsedAnswer, sqId, colCount, sq2ExpandKeys)}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : result.status === 'completed' ? (
          <div className='rounded-2xl border border-yellow-200 bg-yellow-50 p-6'>
            <h3 className='mb-2 text-lg font-semibold text-yellow-900'>No Answers Available</h3>
            <div className='space-y-2 text-sm text-yellow-800'>
              <p>The insight run completed but no answers were returned.</p>
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
