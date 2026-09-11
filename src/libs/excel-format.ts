import * as XLSX from 'xlsx-js-style';

const MIN_COL_WIDTH = 14;
const MAX_COL_WIDTH = 60;
const EMPTY_COL_WIDTH = 10;

const SCORE_FILL: Record<number, { bg: string; fg: string }> = {
  5: { bg: 'FFDCFCE7', fg: 'FF166534' },
  4: { bg: 'FFDCFCE7', fg: 'FF166534' },
  3: { bg: 'FFFEF9C3', fg: 'FF854D0e' },
  2: { bg: 'FFFEE2E2', fg: 'FF991B1B' },
  1: { bg: 'FFFEE2E2', fg: 'FF991B1B' },
};

export function autofitWorksheetColumns(ws: XLSX.WorkSheet, maxWidth = MAX_COL_WIDTH): void {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
  if (rows.length === 0) return;
  const colCount = rows.reduce((n, row) => Math.max(n, row.length), 0);
  const cols: { wch: number }[] = [];
  for (let c = 0; c < colCount; c++) {
    let longest = 0;
    let hasValue = false;
    for (let r = 1; r < rows.length; r++) {
      const cell = rows[r][c];
      if (cell === null || cell === undefined || cell === '') continue;
      hasValue = true;
      const len = String(cell).length;
      if (len > longest) {
        longest = len;
        if (longest >= maxWidth) break;
      }
    }
    if (!hasValue) {
      cols.push({ wch: EMPTY_COL_WIDTH });
    } else {
      cols.push({ wch: Math.min(maxWidth, Math.max(MIN_COL_WIDTH, longest + 2)) });
    }
  }
  ws['!cols'] = cols;
}

export function addHeaderFilter(ws: XLSX.WorkSheet): void {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  if (range.e.r < 1 || range.e.c < 0) return;
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
}

export function applyScoreFills(ws: XLSX.WorkSheet, scoreColIndexes: number[]): void {
  if (scoreColIndexes.length === 0) return;
  const ref = ws['!ref'];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (const c of scoreColIndexes) {
    for (let r = 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as { v?: unknown; s?: object } | undefined;
      if (!cell || typeof cell.v !== 'number') continue;
      const tone = SCORE_FILL[cell.v as number];
      if (!tone) continue;
      cell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: tone.bg } },
        font: { color: { rgb: tone.fg }, bold: true },
      };
    }
  }
}

export function formatResultsWorksheet(ws: XLSX.WorkSheet, scoreColIndexes: number[] = []): void {
  autofitWorksheetColumns(ws);
  addHeaderFilter(ws);
  applyScoreFills(ws, scoreColIndexes);
}
