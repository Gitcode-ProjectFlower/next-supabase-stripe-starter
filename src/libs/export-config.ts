type ExportColumnExtractor = (parsed: Record<string, unknown>) => string;

interface ExportColumn {
  header: string;
  extract: ExportColumnExtractor;
}

const toString = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.map(String).join(', ');
  return String(val);
};

const SQ1_COLUMNS: ExportColumn[] = [
  { header: 'Score', extract: (p) => toString(p['SCORE_VALUE']) },
  { header: 'Rationale', extract: (p) => {
    const raw = toString(p['SCORE_TEXT']);
    return raw.replace(/^Score\s*\d+\s*:\s*/i, '').replace(/^(Score\s*)?(NULL|null)\s*:\s*/i, '');
  }},
];

const SQ2_COLUMNS: ExportColumn[] = [
  { header: 'Primary Customer Type', extract: (p) => toString(p['Primary Customer Type']) },
  { header: 'Geographic Scope', extract: (p) => toString(p['Geographic Scope']) },
  { header: 'Operational Criticality', extract: (p) => toString(p['Operational Criticality']) },
  { header: 'Evidence', extract: (p) => toString(p['Evidence']) },
];

const SQ3_COLUMNS: ExportColumn[] = [
  { header: 'Company Snapshot', extract: (p) => toString(p['Company Snapshot']) },
  { header: 'Target Customers & Markets', extract: (p) => toString(p['Target Customers & Markets']) },
  { header: 'Organizational Buying Context', extract: (p) => toString(p['Organizational Buying Context']) },
  { header: 'Strategic Focus Indicators', extract: (p) => toString(p['Strategic Focus Indicators']) },
  { header: 'Positioning & Differentiation Signals', extract: (p) => toString(p['Positioning & Differentiation Signals']) },
  { header: 'Commercial Entry Points', extract: (p) => toString(p['Commercial Entry Points']) },
  { header: 'Suggested Conversation Angle', extract: (p) => toString(p['Suggested Conversation Angle']) },
  { header: 'Key Website Evidence', extract: (p) => toString(p['Key Website Evidence']) },
];

const SQ4_COLUMNS: ExportColumn[] = [
  { header: 'Message', extract: (p) => toString(p['message']) },
];

const CUSTOM_COLUMNS: ExportColumn[] = [
  { header: 'Answer', extract: () => '' },
];

export function getExportColumnsForSQ(sqId: string | null): ExportColumn[] {
  switch (sqId) {
    case '1': return SQ1_COLUMNS;
    case '2': return SQ2_COLUMNS;
    case '3': return SQ3_COLUMNS;
    case '4': return SQ4_COLUMNS;
    default: return CUSTOM_COLUMNS;
  }
}

export function extractSQValues(
  sqId: string | null,
  answerText: string
): string[] {
  const columns = getExportColumnsForSQ(sqId);

  if (!sqId) return [answerText];

  try {
    const parsed = JSON.parse(answerText) as Record<string, unknown>;
    return columns.map((col) => col.extract(parsed));
  } catch {
    return columns.map(() => '');
  }
}
