import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import { buildCombinedWorkbook, type CombinedItem, type CombinedRun } from '../combined-export';
import { formatRunDateLong } from '../combined-export';
import { extractSQValues, getExportColumnsForSQ } from '../export-config';
import { buildInputSnapshot } from '../input-snapshot';
import { parseCustomAnswer } from '../parse-custom';
import { parseSq1Score, PROMPT_VERSION } from '../qa-output-schemas';

describe('SPS numeric export', () => {
  it('returns Score as number for valid values', () => {
    const values = extractSQValues('1', JSON.stringify({ SCORE_TEXT: 'Good fit', SCORE_VALUE: 4 }));
    expect(values[0]).toBe(4);
  });

  it('coerces string scores to number', () => {
    const values = extractSQValues('1', JSON.stringify({ SCORE_TEXT: 'x', SCORE_VALUE: '3' }));
    expect(values[0]).toBe(3);
  });

  it('returns empty string for NULL scores', () => {
    const values = extractSQValues('1', JSON.stringify({ SCORE_TEXT: 'unclear', SCORE_VALUE: null }));
    expect(values[0]).toBe('');
  });

  it('rejects fractional scores instead of truncating', () => {
    expect(parseSq1Score(3.5)).toBe(null);
    expect(parseSq1Score('3.5')).toBe(null);
    expect(parseSq1Score(' 4 ')).toBe(4);
  });

  it('exposes a prompt version for fresh standard runs', () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('parses JSON answers with fixed keys first', () => {
    const r = parseCustomAnswer(JSON.stringify({ answer: 'Ja, past.', evidence: 'Site zegt X.' }));
    expect(r.answer).toBe('Ja, past.');
    expect(r.evidence).toBe('Site zegt X.');
  });

  it('writes numeric cells into the workbook', () => {
    const wb = buildCombinedWorkbook(
      [{ doc_id: 'a', name: 'A', similarity: 0.9 }],
      [
        {
          sessionId: 's1',
          title: 'Sales Priority Score',
          sqId: '1',
          createdAt: '2026-08-23T14:21:00.000Z',
          companyCount: 1,
          valuesByDocId: new Map([['a', [5, 'Strong fit']]]),
          statusByDocId: new Map([['a', 'success']]),
          inputSnapshot: null,
        },
      ]
    );
    const ws = wb.Sheets['Results'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    expect(rows[0]).toContain('SPS — Score');
    expect(rows[1][1]).toBe(5);
  });
});

describe('custom export without Insights', () => {
  it('has only Answer and Evidence columns', () => {
    expect(getExportColumnsForSQ(null).map((c) => c.header)).toEqual(['Answer', 'Evidence']);
  });

  it('extracts two values', () => {
    const values = extractSQValues(null, '**Answer** - Yes.\n**Evidence** - Site.');
    expect(values).toEqual(['Yes.', 'Site.']);
  });
});

describe('input snapshots', () => {
  it('maps new SQ1 keys to labels', () => {
    const snap = buildInputSnapshot(
      '1',
      { productDescription: 'Staffing', icp: 'Warehouses', exclusions: '' },
      'Sales Priority Score'
    );
    expect(snap.fields.map((f) => f.label)).toEqual(['Product / Service Description', 'Ideal Customer Profile (ICP)']);
  });

  it('falls back to prompt when form is empty', () => {
    const snap = buildInputSnapshot(null, null, 'What does it do?');
    expect(snap.fields).toEqual([
      { key: 'prompt', label: 'Question', type: 'textarea', value: 'What does it do?', order: 0 },
    ]);
  });
});

describe('combined workbook', () => {
  const item: CombinedItem = { doc_id: 'a', name: 'Company A', city: 'London', similarity: 0.8 };

  function run(title: string, createdAt: string, value: string): CombinedRun {
    return {
      sessionId: `${title}-${createdAt}`,
      title,
      sqId: '4',
      createdAt,
      companyCount: 1,
      valuesByDocId: new Map([['a', [value]]]),
      statusByDocId: new Map([['a', 'success']]),
      inputSnapshot: { fields: [{ key: 'k', label: 'Focus', type: 'text', value, order: 0 }] },
    };
  }

  it('keeps repeated runs in separate dated columns', () => {
    const wb = buildCombinedWorkbook(
      [item],
      [
        run('Account Intelligence Brief', '2026-08-23T14:37:00.000Z', 'v1'),
        run('Account Intelligence Brief', '2026-08-23T15:03:00.000Z', 'v2'),
      ]
    );
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][];
    const headers = rows[0] as string[];
    const runHeaders = headers.filter((h) => h.startsWith('Account Intelligence Brief'));
    expect(runHeaders.length).toBe(2);
    expect(runHeaders[0]).not.toBe(runHeaders[1]);
    expect(rows[1]).toContain('v1');
    expect(rows[1]).toContain('v2');
  });

  it('shows only the latest status and one Analysis details block per run', () => {
    const wb = buildCombinedWorkbook(
      [item],
      [
        run('Account Intelligence Brief', '2026-08-23T14:37:00.000Z', 'v1'),
        run('Market Segmentation', '2026-08-23T14:45:00.000Z', 'v2'),
      ]
    );
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][];
    const headers = rows[0] as string[];
    expect(headers.filter((h) => h === 'Status').length).toBe(1);
    expect(rows[1][headers.length - 1]).toBe('success');

    const details = XLSX.utils.sheet_to_json(wb.Sheets['Analysis details'], { header: 1 }) as unknown[][];
    const flat = details.flat().join('\n');
    expect(flat).toContain('Analysis: Account Intelligence Brief');
    expect(flat).toContain('Analysis: Market Segmentation');
    expect(flat).toContain('Focus');
  });

  it('uses long dates in Analysis details', () => {
    expect(formatRunDateLong('2026-08-23T14:21:00.000Z')).toContain('2026');
  });

  function spsRun(): CombinedRun {
    return {
      sessionId: 'sps-1',
      title: 'Sales Priority Score',
      sqId: '1',
      createdAt: '2026-08-23T16:00:00.000Z',
      companyCount: 1,
      valuesByDocId: new Map([['a', [5, 'Strong fit.']]]),
      statusByDocId: new Map([['a', 'success']]),
      inputSnapshot: null,
    };
  }

  it('pins the SPS verdict right after Name', () => {
    const wb = buildCombinedWorkbook(
      [item],
      [run('Account Intelligence Brief', '2026-08-23T14:37:00.000Z', 'v1'), spsRun()]
    );
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][];
    const headers = rows[0] as string[];
    expect(headers[0]).toBe('Name');
    expect(headers[1]).toBe('SPS — Score');
    expect(headers[2]).toBe('SPS — Rationale');
    expect(headers[3]).toBe('Fit Score');
    expect(rows[1][1]).toBe(5);
  });

  it('keeps base-first order when no SPS run exists', () => {
    const wb = buildCombinedWorkbook([item], [run('Account Intelligence Brief', '2026-08-23T14:37:00.000Z', 'v1')]);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Results'], { header: 1 }) as unknown[][];
    expect((rows[0] as string[]).slice(0, 2)).toEqual(['Name', 'Fit Score']);
    expect(rows[0]).toContain('Account Intelligence Brief — Message');
  });

  it('gives empty columns minimal width', () => {
    const wb = buildCombinedWorkbook([item], [spsRun()]);
    const cols = wb.Sheets['Results']['!cols'] as { wch: number }[];
    expect(cols[16].wch).toBe(10);
    expect(cols[0].wch).toBeGreaterThanOrEqual(14);
  });

  it('paints score fills like the website badges', () => {
    const wb = buildCombinedWorkbook([item], [spsRun()]);
    const ws = wb.Sheets['Results'];
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c: 1 })] as { s?: { fill?: { fgColor?: { rgb?: string } } } };
    expect(cell.s?.fill?.fgColor?.rgb).toBe('FFDCFCE7');
  });

  it('adds autofilter and autofit widths to Results', () => {
    const wb = buildCombinedWorkbook(
      [item],
      [
        run('Account Intelligence Brief', '2026-08-23T14:37:00.000Z', 'v1'),
        run('Market Segmentation', '2026-08-23T14:45:00.000Z', 'v2'),
      ]
    );
    const ws = wb.Sheets['Results'];
    const filter = (ws['!autofilter'] as { ref?: string } | undefined)?.ref;
    expect(filter).toBe(ws['!ref']);
    const cols = ws['!cols'] as { wch: number }[] | undefined;
    const headerCount = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][])[0].length;
    expect(cols?.length).toBe(headerCount);
    for (const col of cols ?? []) {
      expect(col.wch).toBeGreaterThanOrEqual(10);
      expect(col.wch).toBeLessThanOrEqual(60);
    }
  });

  it('autofits Analysis details columns', () => {
    const wb = buildCombinedWorkbook([item], [run('Account Intelligence Brief', '2026-08-23T14:37:00.000Z', 'v1')]);
    const ws = wb.Sheets['Analysis details'];
    const cols = ws['!cols'] as { wch: number }[] | undefined;
    expect(cols?.length).toBeGreaterThan(0);
    expect((ws['!autofilter'] as { ref?: string } | undefined)?.ref).toBeUndefined();
  });
});
