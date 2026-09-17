import * as XLSX from 'xlsx-js-style';

import { extractSQValues, getExportColumnsForSQ } from '@/libs/export-config';
import { autofitWorksheetColumns, formatResultsWorksheet } from '@/libs/excel-format';
import { formatSnapshotValue, type InputSnapshot } from '@/libs/input-snapshot';
import { normalizeValue } from '@/utils/normalize-value';

export const SQ_TITLES: Record<string, string> = {
  '1': 'Sales Priority Score',
  '2': 'Market Segmentation',
  '3': 'Account Intelligence Brief',
  '4': 'Personalized Outreach Message',
};

export interface CombinedRun {
  sessionId: string;
  title: string;
  sqId: string | null;
  createdAt: string;
  companyCount: number;
  valuesByDocId: Map<string, (string | number)[]>;
  statusByDocId: Map<string, string>;
  inputSnapshot: InputSnapshot | null;
}

export interface CombinedItem {
  doc_id: string;
  name?: string;
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
  similarity?: number | null;
}

export const COMBINED_BASE_HEADERS = [
  'Name',
  'Fit Score',
  'Domain',
  'Company Size',
  'Email',
  'Phone',
  'Street',
  'City',
  'Postal Code',
  'Sector Level 1',
  'Sector Level 2',
  'Sector Level 3',
  'Region Level 1',
  'Region Level 2',
  'Region Level 3',
  'Region Level 4',
  'LinkedIn Company URL',
  'Legal Form',
];

function baseCells(item: CombinedItem): (string | number)[] {
  return [
    normalizeValue(item.name),
    item.similarity != null ? Math.round(item.similarity * 100) + '%' : '',
    normalizeValue(item.domain),
    normalizeValue(item.company_size),
    normalizeValue(item.email),
    normalizeValue(item.phone),
    normalizeValue(item.street),
    normalizeValue(item.city),
    normalizeValue(item.postal_code),
    normalizeValue(item.sector_level1),
    normalizeValue(item.sector_level2),
    normalizeValue(item.sector_level3),
    normalizeValue(item.region_level1),
    normalizeValue(item.region_level2),
    normalizeValue(item.region_level3),
    normalizeValue(item.region_level4),
    normalizeValue(item.linkedin_company_url),
    normalizeValue(item.legal_form),
  ];
}

export function formatRunDateLong(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function runTitle(session: { standard_question_id?: string | null; prompt: string }): {
  title: string;
  sqId: string | null;
} {
  const sqId = session.standard_question_id ?? null;
  if (sqId && SQ_TITLES[sqId]) return { title: SQ_TITLES[sqId], sqId };
  return { title: `Custom: ${session.prompt.slice(0, 50)}`, sqId: null };
}

export function buildRunPrefix(title: string, sqId: string | null, occurrences: number, createdAt: string): string {
  const label = (sqId && SHORT_RUN_TITLES[sqId]) || title;
  return occurrences > 1 ? `${label} — ${formatRunDateLong(createdAt)}` : label;
}

export function buildRunColumns(title: string, sqId: string | null, occurrences: number, createdAt: string): string[] {
  const headers = getExportColumnsForSQ(sqId).map((c) => c.header);
  const prefix = buildRunPrefix(title, sqId, occurrences, createdAt);
  return headers.map((h) => `${prefix} — ${h}`);
}

const SHORT_RUN_TITLES: Record<string, string> = { '1': 'SPS' };

export function buildCombinedWorkbook(items: CombinedItem[], runs: CombinedRun[]): XLSX.WorkBook {
  // SPS verdict first, right after Name: the score column must be visible
  // without scrolling. Remaining runs keep chronological order (stable sort
  // keeps the input order, which the export job provides oldest-first).
  const orderedRuns = [...runs].sort((a, b) => (a.sqId === '1' ? 0 : 1) - (b.sqId === '1' ? 0 : 1));
  const spsRuns = orderedRuns.filter((run) => run.sqId === '1');
  const otherRuns = orderedRuns.filter((run) => run.sqId !== '1');
  const frontRuns = [...spsRuns, ...otherRuns];

  const titleCounts: Record<string, number> = {};
  for (const run of frontRuns) titleCounts[run.title] = (titleCounts[run.title] || 0) + 1;

  const usedPrefixes = new Map<string, number>();
  const runHeaders = frontRuns.map((run) => {
    let prefix = buildRunPrefix(run.title, run.sqId, titleCounts[run.title], run.createdAt);
    const seen = usedPrefixes.get(prefix) ?? 0;
    usedPrefixes.set(prefix, seen + 1);
    if (seen > 0) prefix = `${prefix} (${seen + 1})`;
    const headers = getExportColumnsForSQ(run.sqId).map((c) => c.header);
    return headers.map((h) => `${prefix} — ${h}`);
  });
  const headers = [
    COMBINED_BASE_HEADERS[0],
    ...runHeaders.slice(0, spsRuns.length).flat(),
    ...COMBINED_BASE_HEADERS.slice(1),
    ...runHeaders.slice(spsRuns.length).flat(),
    'Status',
  ];

  const scoreColIndexes: number[] = [];
  let offset = 1;
  frontRuns.forEach((run, i) => {
    if (run.sqId === '1') scoreColIndexes.push(offset);
    offset += runHeaders[i].length;
  });

  const rows = items.map((item) => {
    const base = [...baseCells(item)];
    const spsCells: (string | number)[] = [];
    const otherCells: (string | number)[] = [];
    frontRuns.forEach((run, i) => {
      const values = run.valuesByDocId.get(item.doc_id);
      const cells = values ?? runHeaders[i].map(() => '');
      if (run.sqId === '1') spsCells.push(...cells);
      else otherCells.push(...cells);
    });
    let status = '';
    for (const run of runs) {
      const s = run.statusByDocId.get(item.doc_id);
      if (s) status = s;
    }
    return [base[0], ...spsCells, ...base.slice(1), ...otherCells, status];
  });

  const wb = XLSX.utils.book_new();
  const resultsWs = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  formatResultsWorksheet(resultsWs, scoreColIndexes);
  XLSX.utils.book_append_sheet(wb, resultsWs, 'Results');

  const detailRows: (string | number)[][] = [];
  for (const run of frontRuns) {
    detailRows.push(
      [`Analysis: ${run.title}`],
      [`Run date: ${formatRunDateLong(run.createdAt)}`],
      [`Companies analysed: ${run.companyCount}`],
      []
    );
    const fields = run.inputSnapshot?.fields ?? [];
    if (fields.length === 0) {
      detailRows.push(['Input not recorded for this run'], []);
    } else {
      for (const field of [...fields].sort((a, b) => a.order - b.order)) {
        detailRows.push([field.label, formatSnapshotValue(field)]);
      }
      detailRows.push([]);
    }
  }
  const detailsWs = XLSX.utils.aoa_to_sheet(detailRows.length > 0 ? detailRows : [['No analyses yet']]);
  autofitWorksheetColumns(detailsWs);
  XLSX.utils.book_append_sheet(wb, detailsWs, 'Analysis details');

  return wb;
}

export function extractRunValues(
  sqId: string | null,
  answerText: string | null,
  status: string
): (string | number)[] | null {
  if (status !== 'success' || !answerText) return null;
  return extractSQValues(sqId, answerText);
}
