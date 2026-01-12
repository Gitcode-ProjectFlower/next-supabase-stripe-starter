/* eslint-disable simple-import-sort/imports */
'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UpgradeCTA } from '@/components/upgrade-cta';
import { getTopKLimit, getVisibleColumns, type UserPlan } from '@/libs/plan-config';
import { requiresUpgrade } from '@/libs/soft-gating';
import { LookalikeResult } from '@/types/selection';
import { cn } from '@/utils/cn';
import { normalizeValue } from '@/utils/normalize-value';

interface ResultsWorkspaceProps {
  results: LookalikeResult[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onGenerateAnswers?: (prompt: string) => void;
  isProcessingQA?: boolean;
  isPreviewMode?: boolean;
  userPlan?: string | null;
  topK?: number;
}

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

type SortKey = ColumnKey;
type SortDirection = 'asc' | 'desc';

const COLUMN_CONFIG: Record<
  ColumnKey,
  {
    label: string;
    render: (row: LookalikeResult) => React.ReactNode;
    sortValue?: (row: LookalikeResult) => string | number;
  }
> = {
  name: {
    label: 'Name',
    render: (row) => normalizeValue(row.name) || '-',
    sortValue: (row) => normalizeValue(row.name),
  },
  domain: {
    label: 'Domain',
    render: (row) => normalizeValue(row.domain) || '-',
    sortValue: (row) => normalizeValue(row.domain),
  },
  company_size: {
    label: 'Company Size',
    render: (row) => normalizeValue(row.company_size) || '-',
    sortValue: (row) => normalizeValue(row.company_size),
  },
  email: {
    label: 'Email',
    render: (row) => normalizeValue(row.email) || '-',
    sortValue: (row) => normalizeValue(row.email),
  },
  phone: {
    label: 'Phone',
    render: (row) => normalizeValue(row.phone) || '-',
    sortValue: (row) => normalizeValue(row.phone),
  },
  street: {
    label: 'Street',
    render: (row) => normalizeValue(row.street) || '-',
    sortValue: (row) => normalizeValue(row.street),
  },
  city: {
    label: 'City',
    render: (row) => normalizeValue(row.city) || '-',
    sortValue: (row) => normalizeValue(row.city),
  },
  postal_code: {
    label: 'Postal Code',
    render: (row) => normalizeValue(row.postal_code) || '-',
    sortValue: (row) => normalizeValue(row.postal_code),
  },
  sector_level1: {
    label: 'Sector Level 1',
    render: (row) => normalizeValue(row.sector_level1) || '-',
    sortValue: (row) => normalizeValue(row.sector_level1),
  },
  sector_level2: {
    label: 'Sector Level 2',
    render: (row) => normalizeValue(row.sector_level2) || '-',
    sortValue: (row) => normalizeValue(row.sector_level2),
  },
  sector_level3: {
    label: 'Sector Level 3',
    render: (row) => normalizeValue(row.sector_level3) || '-',
    sortValue: (row) => normalizeValue(row.sector_level3),
  },
  region_level1: {
    label: 'Region Level 1',
    render: (row) => normalizeValue(row.region_level1) || '-',
    sortValue: (row) => normalizeValue(row.region_level1),
  },
  region_level2: {
    label: 'Region Level 2',
    render: (row) => normalizeValue(row.region_level2) || '-',
    sortValue: (row) => normalizeValue(row.region_level2),
  },
  region_level3: {
    label: 'Region Level 3',
    render: (row) => normalizeValue(row.region_level3) || '-',
    sortValue: (row) => normalizeValue(row.region_level3),
  },
  region_level4: {
    label: 'Region Level 4',
    render: (row) => normalizeValue(row.region_level4) || '-',
    sortValue: (row) => normalizeValue(row.region_level4),
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
    sortValue: (row) => normalizeValue(row.linkedin_company_url),
  },
  legal_form: {
    label: 'Legal Form',
    render: (row) => normalizeValue(row.legal_form) || '-',
    sortValue: (row) => normalizeValue(row.legal_form),
  },
  similarity: {
    label: 'Fit Score',
    render: (row) =>
      row.similarity ? (
        <div className='flex items-center gap-2'>
          <div className='h-2 w-24 overflow-hidden rounded-full bg-gray-200'>
            <div
              className='h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all'
              style={{
                width: `${(row.similarity * 100).toFixed(0)}%`,
              }}
            />
          </div>
          <span className='text-xs font-medium text-gray-700'>{(row.similarity * 100).toFixed(0)}%</span>
        </div>
      ) : (
        '-'
      ),
    sortValue: (row) => row.similarity ?? 0,
  },
};

export function ResultsWorkspace({
  results,
  isLoading,
  selectedIds,
  onSelectionChange,
  onGenerateAnswers,
  isProcessingQA = false,
  isPreviewMode = false,
  userPlan,
  topK = 0,
}: ResultsWorkspaceProps) {
  const userPlanTyped = userPlan as UserPlan;
  const needsUpgradeForQA = userPlanTyped && requiresUpgrade(userPlanTyped, 'qa');
  const [sortKey, setSortKey] = useState<SortKey>('similarity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState<'candidates' | 'selected'>('candidates');
  const [prompt, setPrompt] = useState('');
  const visibleColumns: ColumnKey[] = useMemo(() => {
    const cols = getVisibleColumns(userPlanTyped || 'anonymous').filter(
      (col): col is ColumnKey => (COLUMN_CONFIG as Record<string, unknown>)[col] !== undefined
    );
    return cols.length ? cols : ['name'];
  }, [userPlanTyped]);

  useEffect(() => {
    if (!visibleColumns.includes(sortKey)) {
      setSortKey(visibleColumns[0]);
    }
  }, [visibleColumns, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc'); // Default to desc for new key (usually better for scores/dates)
    }
  };

  const displayedResults = useMemo(() => {
    let data = results;
    if (activeTab === 'selected') {
      data = data.filter((r) => selectedIds.has(r.doc_id));
    }

    if (!data.length) return [];

    return [...data].sort((a, b) => {
      const sorter = COLUMN_CONFIG[sortKey]?.sortValue;
      let aVal: any = sorter ? sorter(a) : (a as any)[sortKey];
      let bVal: any = sorter ? sorter(b) : (b as any)[sortKey];

      if (Array.isArray(aVal)) aVal = aVal[0] || '';
      if (Array.isArray(bVal)) bVal = bVal[0] || '';

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortKey, sortDirection, activeTab, selectedIds]);

  const handleSelectAll = () => {
    // If on "Selected" tab, select all doesn't make sense to add more, maybe just clear?
    // But let's keep it simple: Select All always operates on the current view?
    // Actually, standard behavior:
    // If on Candidates (All): Select All -> Selects all candidates
    // If on Selected: They are already selected. Maybe "Deselect All" clears them.

    if (activeTab === 'selected') {
      // If we are viewing selected, "Select All" checkbox should probably be checked if all visible are selected (which they are).
      // Unchecking it should deselect all visible (which is all selected).
      onSelectionChange(new Set());
      return;
    }

    // On Candidates tab
    if (selectedIds.size === results.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(results.map((r) => r.doc_id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  // Scroll gate disabled - no automatic overlay on scroll
  // Users can still see the preview banner which has upgrade CTA

  const planLimit = useMemo(() => getTopKLimit(userPlanTyped || 'anonymous'), [userPlanTyped]);
  const shouldShowPreviewBanner =
    isPreviewMode && topK >= planLimit && userPlan !== 'large' && userPlan !== 'promo_medium';

  return (
    <>
      {/* Preview Mode Banner */}
      {shouldShowPreviewBanner && (
        <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex-1'>
              <h3 className='mb-1 text-sm font-semibold text-blue-900'>Preview Mode</h3>
              <p className='text-sm text-blue-700'>
                You're viewing a limited preview with {results.length} results.
                {userPlan === 'anonymous' || !userPlan
                  ? ' Sign up for free to unlock more features!'
                  : ' Upgrade your plan to see more results and unlock all features.'}
              </p>
            </div>
            <UpgradeCTA size='sm' />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className='mb-3 flex items-center gap-2'>
        <Button
          variant={activeTab === 'candidates' ? 'default' : 'outline'}
          className={cn(
            'rounded-xl text-sm',
            activeTab === 'candidates'
              ? 'bg-gray-900 text-white hover:bg-black'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          )}
          onClick={() => setActiveTab('candidates')}
        >
          Candidates
        </Button>
        <Button
          variant={activeTab === 'selected' ? 'default' : 'outline'}
          className={cn(
            'rounded-xl text-sm',
            activeTab === 'selected'
              ? 'bg-gray-900 text-white hover:bg-black'
              : 'border-gray-200 bg-white hover:bg-gray-50'
          )}
          onClick={() => setActiveTab('selected')}
        >
          Selected
        </Button>
        <div className='ml-auto flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='bg-white hover:bg-gray-50'
            onClick={handleSelectAll}
            disabled={results.length === 0}
          >
            {selectedIds.size > 0 && selectedIds.size === results.length ? 'Deselect all' : 'Select all'}
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='bg-white hover:bg-gray-50'
            onClick={() => onSelectionChange(new Set())}
            disabled={selectedIds.size === 0}
          >
            Clear
          </Button>
          <Badge
            variant='secondary'
            className='border-none bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100'
          >
            {selectedIds.size} selected
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className='min-h-[400px] overflow-hidden rounded-2xl border bg-white shadow-sm'>
        <div className='max-h-[600px] overflow-auto'>
          <Table>
            <TableHeader className='sticky top-0 z-10 bg-gray-50'>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='w-[40px] px-3 py-2'>
                  <input
                    type='checkbox'
                    className='rounded border-gray-300'
                    checked={results.length > 0 && selectedIds.size === results.length}
                    onChange={handleSelectAll}
                    disabled={results.length === 0}
                  />
                </TableHead>
                {visibleColumns.map((key) => (
                  <TableHead
                    key={key}
                    className='cursor-pointer whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-100'
                    onClick={() => handleSort(key)}
                  >
                    <div className='flex items-center gap-1'>
                      {COLUMN_CONFIG[key].label}
                      {sortKey === key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className='h-3 w-3' />
                        ) : (
                          <ArrowDown className='h-3 w-3' />
                        )
                      ) : (
                        <ArrowUpDown className='h-3 w-3 opacity-30' />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className='hover:bg-transparent'>
                  <TableCell colSpan={visibleColumns.length + 1} className='h-24 text-center'>
                    Loading candidates...
                  </TableCell>
                </TableRow>
              ) : displayedResults.length === 0 ? (
                <TableRow className='hover:bg-transparent'>
                  <TableCell colSpan={visibleColumns.length + 1} className='h-24 text-center text-gray-500'>
                    {activeTab === 'selected'
                      ? 'No candidates selected yet.'
                      : 'No candidates found. Try adjusting your filters or adding names.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayedResults.map((r, idx) => {
                  const isSelected = selectedIds.has(r.doc_id);
                  return (
                    <TableRow
                      key={r.doc_id || idx}
                      className={cn('cursor-pointer hover:bg-gray-50', isSelected && 'bg-blue-50/50 hover:bg-blue-100')}
                      onClick={() => handleSelectRow(r.doc_id)}
                    >
                      <TableCell className='px-3 py-2'>
                        <input
                          type='checkbox'
                          checked={isSelected}
                          onChange={() => handleSelectRow(r.doc_id)}
                          className='rounded border-gray-300'
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      {visibleColumns.map((key) => (
                        <TableCell
                          key={key}
                          className={cn(
                            'px-3 py-2',
                            key === 'email' || key === 'city' || key === 'street' || key === 'linkedin_company_url'
                              ? 'max-w-[200px] truncate'
                              : 'whitespace-nowrap',
                            key === 'name' && 'font-medium'
                          )}
                          title={
                            key === 'email'
                              ? r.email
                              : key === 'city' || key === 'street' || key === 'linkedin_company_url'
                              ? (r as any)[key] || ''
                              : undefined
                          }
                        >
                          {COLUMN_CONFIG[key].render(r)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Prompt bar */}
      <div className='sticky bottom-2 z-10 mt-4'>
        <div className='rounded-2xl border bg-white p-3 shadow-sm'>
          <div className='flex items-start gap-3'>
            <Textarea
              className='min-h-[72px] flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-gray-900'
              placeholder={
                selectedIds.size === 0
                  ? 'Select at least one candidate to ask questions...'
                  : 'Ask your question here (multiple questions allowed) — each resume gives an answer...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessingQA || selectedIds.size === 0}
            />
            <div className='w-56 space-y-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        className='w-full rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
                        onClick={() => onGenerateAnswers?.(prompt)}
                        disabled={
                          isProcessingQA ||
                          !prompt.trim() ||
                          selectedIds.size === 0 ||
                          needsUpgradeForQA ||
                          userPlan === 'anonymous' ||
                          !userPlan
                        }
                      >
                        {isProcessingQA ? 'Processing...' : 'Generate answers'}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {needsUpgradeForQA && (
                    <TooltipContent>
                      <p>Upgrade your plan to use AI Q&A</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {isProcessingQA && (
                <div className='space-y-1'>
                  <div className='flex items-center justify-between text-xs text-gray-600'>
                    <span>Status</span>
                    <span>Processing...</span>
                  </div>
                  <div className='h-2 w-full overflow-hidden rounded-full bg-gray-100'>
                    <div className='h-full animate-pulse bg-blue-600' style={{ width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
