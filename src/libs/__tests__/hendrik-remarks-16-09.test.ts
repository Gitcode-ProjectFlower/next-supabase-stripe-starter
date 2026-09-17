import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx-js-style';

import { buildCombinedWorkbook, type CombinedItem, type CombinedRun } from '../combined-export';
import { buildFollowUpSessionInsert } from '../follow-up-copy';
import { resolveQaDownloadUrl } from '../qa-download';

describe('hendrik remarks 16-09: SPS follow-up + combined Excel', () => {
  const items: CombinedItem[] = [
    { doc_id: 'c1', name: 'Company One', similarity: 0.97 },
    { doc_id: 'c2', name: 'Company Two', similarity: 0.95 },
    { doc_id: 'c3', name: 'Company Three', similarity: 0.93 },
  ];

  function spsCopiedRun(): CombinedRun {
    return {
      sessionId: 'sps-original-copied',
      title: 'Sales Priority Score',
      sqId: '1',
      createdAt: '2026-09-16T16:00:00.000Z',
      companyCount: 3,
      valuesByDocId: new Map<string, (string | number)[]>([
        ['c1', [5, 'Strong fit']],
        ['c2', [4, 'Good fit']],
        ['c3', [4, 'Good fit']],
      ]),
      statusByDocId: new Map([
        ['c1', 'success'],
        ['c2', 'success'],
        ['c3', 'success'],
      ]),
      inputSnapshot: null,
    };
  }

  function segmentationRun(): CombinedRun {
    const segValues = (segment: string): (string | number)[] => [segment, segment, 'National', segment, 'Site'];
    return {
      sessionId: 'seg-new',
      title: 'Market Segmentation',
      sqId: '2',
      createdAt: '2026-09-16T17:00:00.000Z',
      companyCount: 3,
      valuesByDocId: new Map<string, (string | number)[]>([
        ['c1', segValues('Enterprise')],
        ['c2', segValues('Mid-market')],
        ['c3', segValues('Mid-market')],
      ]),
      statusByDocId: new Map([
        ['c1', 'success'],
        ['c2', 'success'],
        ['c3', 'success'],
      ]),
      inputSnapshot: null,
    };
  }

  it('keeps the copied SPS score + rationale next to the follow-up analysis', () => {
    const wb = buildCombinedWorkbook(items, [spsCopiedRun(), segmentationRun()]);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][];
    const headers = rows[0] as string[];

    expect(headers[0]).toBe('Name');
    expect(headers[1]).toBe('SPS — Score');
    expect(headers[2]).toBe('SPS — Rationale');
    expect(headers).toContain('Market Segmentation — Primary Customer Type');
    expect(headers).toContain('Market Segmentation — Evidence');

    const byName = new Map(rows.slice(1).map((r) => [r[0], r]));
    expect(byName.get('Company One')?.[1]).toBe(5);
    expect(byName.get('Company One')?.[2]).toBe('Strong fit');
    expect(byName.get('Company Two')?.[1]).toBe(4);
  });

  it('keeps SPS columns when runs arrive oldest-first like the export job provides', () => {
    const wb = buildCombinedWorkbook(items, [spsCopiedRun(), segmentationRun()]);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][];
    expect((rows[0] as string[]).slice(0, 3)).toEqual(['Name', 'SPS — Score', 'SPS — Rationale']);
  });

  it('gives repeated same-minute runs unique column headers', () => {
    const run = (sessionId: string): CombinedRun => ({
      sessionId,
      title: 'Account Intelligence Brief',
      sqId: '3',
      createdAt: '2026-09-09T15:54:10.000Z',
      companyCount: 1,
      valuesByDocId: new Map([['c1', ['Snap']]]),
      statusByDocId: new Map([['c1', 'success']]),
      inputSnapshot: null,
    });
    const wb = buildCombinedWorkbook([items[0]], [run('a'), run('b')]);
    const headers = (XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][])[0] as string[];
    expect(new Set(headers).size).toBe(headers.length);
    expect(headers.filter((h) => h.includes('Company Snapshot')).length).toBe(2);
  });

  it('carries the per-run Excel url into the follow-up selection', () => {
    const insert = buildFollowUpSessionInsert(
      {
        prompt: 'Sales Priority Score',
        form_input: { productDescription: 'X' },
        input_snapshot: null,
        created_at: '2026-09-16T16:00:00.000Z',
        completed_at: '2026-09-16T16:05:00.000Z',
        csv_url: 'https://storage/exports/qa_old.xlsx?token=abc',
      },
      'user-1',
      'selection-new'
    );
    expect(insert).toMatchObject({
      user_id: 'user-1',
      selection_id: 'selection-new',
      status: 'completed',
      progress: 100,
      standard_question_id: '1',
      csv_url: 'https://storage/exports/qa_old.xlsx?token=abc',
    });
  });

  it('leaves csv_url empty when the source run never generated Excel', () => {
    const insert = buildFollowUpSessionInsert(
      {
        prompt: 'Sales Priority Score',
        form_input: null,
        input_snapshot: null,
        created_at: '2026-09-16T16:00:00.000Z',
        completed_at: '2026-09-16T16:05:00.000Z',
        csv_url: null,
      },
      'user-1',
      'selection-new'
    );
    expect(insert.csv_url).toBeNull();
  });

  it('opens the run Excel directly when the run has one', () => {
    expect(resolveQaDownloadUrl('https://storage/exports/qa_1.xlsx')).toBe('https://storage/exports/qa_1.xlsx');
  });

  it('falls back when the run has no Excel yet', () => {
    expect(resolveQaDownloadUrl(null)).toBeNull();
    expect(resolveQaDownloadUrl('#')).toBeNull();
    expect(resolveQaDownloadUrl('   ')).toBeNull();
  });
});
