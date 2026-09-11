const ANSWER_LABELS = ['answer', 'antwoord', 'antwort', 'réponse', 'reponse', 'respuesta', 'risposta'];

const EVIDENCE_LABELS = [
  'evidence',
  'bewijs',
  'beleg',
  'belege',
  'nachweis',
  'nachweise',
  'preuve',
  'evidencia',
  'evidenza',
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function labelPattern(labels: string[]): string {
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  return `\\*{0,2}\\s*\\b(?:${sorted.map(escapeRegExp).join('|')})\\b\\s*:?\\s*\\*{0,2}`;
}

export interface CustomSections {
  answer: string;
  evidence: string;
}

export function parseCustomAnswer(text: string): CustomSections {
  const result: CustomSections = { answer: '', evidence: '' };
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const pick = (...keys: string[]): string => {
      for (const key of Object.keys(parsed)) {
        if (keys.includes(key.toLowerCase()) && typeof parsed[key] === 'string') return (parsed[key] as string).trim();
      }
      return '';
    };
    result.answer = pick('answer');
    result.evidence = pick('evidence');
    if (result.answer || result.evidence) return result;
  } catch {
    // Not JSON — fall through to label parsing.
  }
  const answerMatch = text.match(
    new RegExp(`${labelPattern(ANSWER_LABELS)}\\s*[-–]?\\s*([\\s\\S]*?)(?=${labelPattern(EVIDENCE_LABELS)}|$)`, 'i')
  );
  const evidenceMatch = text.match(new RegExp(`${labelPattern(EVIDENCE_LABELS)}\\s*[-–]?\\s*([\\s\\S]*?)$`, 'i'));
  if (answerMatch) result.answer = answerMatch[1].trim();
  if (evidenceMatch) result.evidence = evidenceMatch[1].trim();
  if (!result.answer && !result.evidence) result.answer = text;
  return result;
}
