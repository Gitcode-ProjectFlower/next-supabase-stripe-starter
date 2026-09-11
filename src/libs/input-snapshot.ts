export type SnapshotFieldType = 'text' | 'textarea' | 'boolean' | 'select' | 'multi-select' | 'number' | 'list';

export interface SnapshotField {
  key: string;
  label: string;
  type: SnapshotFieldType;
  value: unknown;
  order: number;
}

export interface InputSnapshot {
  fields: SnapshotField[];
}

const FIELD_DEFS: Record<string, { label: string; type: SnapshotFieldType }> = {
  productDescription: { label: 'Product / Service Description', type: 'textarea' },
  productName: { label: 'Product name', type: 'text' },
  icp: { label: 'Ideal Customer Profile (ICP)', type: 'textarea' },
  icpCharacteristics: { label: 'Ideal Customer Profile', type: 'textarea' },
  icpSignals: { label: 'ICP Signals', type: 'multi-select' },
  icpSignalsOther: { label: 'Other ICP Signal', type: 'text' },
  commercialSignals: { label: 'Commercial Attractiveness Signals', type: 'multi-select' },
  commercialSignalsOther: { label: 'Other Commercial Signal', type: 'text' },
  exclusions: { label: 'Exclusions / Red Flags', type: 'textarea' },
  scoringFocus: { label: 'Scoring Focus', type: 'select' },
  productContext: { label: 'Product / Service Context', type: 'textarea' },
  conversationPerspective: { label: 'Intended Conversation Perspective', type: 'select' },
  salesObjective: { label: 'Sales Objective', type: 'select' },
  primaryFocusPreference: { label: 'Primary Focus Preference', type: 'select' },
  conversationTonePreference: { label: 'Conversation Tone Preference', type: 'select' },
  whatYouSell: { label: 'What do you sell?', type: 'textarea' },
  whoIsItFor: { label: 'Who is it for?', type: 'text' },
  coreOutcome: { label: 'Core Outcome', type: 'text' },
  usps: { label: 'What differentiates your offering?', type: 'list' },
  channel: { label: 'Channel', type: 'select' },
  messageLength: { label: 'Message Length', type: 'select' },
  tonePreference: { label: 'Tone Preference', type: 'select' },
  customDimensionName: { label: 'Custom Dimension', type: 'text' },
  customDimensionValues: { label: 'Classification Values', type: 'list' },
  dimensions: { label: 'Dimensions to extract', type: 'multi-select' },
  'Custom Dimension Name': { label: 'Custom Dimension', type: 'text' },
  'Custom Dimension Allowed Values': { label: 'Classification Values', type: 'text' },
};

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.filter((v) => v !== '' && v !== null && v !== undefined).length === 0;
  return false;
}

function inferField(key: string, value: unknown, order: number): SnapshotField {
  const def = FIELD_DEFS[key];
  let type: SnapshotFieldType = def?.type ?? 'text';
  if (!def) {
    if (typeof value === 'boolean') type = 'boolean';
    else if (typeof value === 'number') type = 'number';
    else if (Array.isArray(value)) type = 'list';
    else if (typeof value === 'string' && value.length > 80) type = 'textarea';
  }
  const label = def?.label ?? key;
  const cleanValue = Array.isArray(value) ? value.filter((v) => v !== '' && v !== null && v !== undefined) : value;
  return { key, label, type, value: cleanValue, order };
}

export function buildInputSnapshot(
  standardQuestionId: string | null | undefined,
  formInput: Record<string, unknown> | null | undefined,
  prompt: string
): InputSnapshot {
  void standardQuestionId;
  const fields: SnapshotField[] = [];
  if (!formInput || Object.keys(formInput).length === 0) {
    fields.push({ key: 'prompt', label: 'Question', type: 'textarea', value: prompt, order: 0 });
    return { fields };
  }
  let order = 0;
  for (const [key, value] of Object.entries(formInput)) {
    if (isEmptyValue(value)) continue;
    fields.push(inferField(key, value, order++));
  }
  if (fields.length === 0) {
    fields.push({ key: 'prompt', label: 'Question', type: 'textarea', value: prompt, order: 0 });
  }
  return { fields };
}

export function formatSnapshotValue(field: SnapshotField): string {
  const { type, value } = field;
  if (value === null || value === undefined) return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}
