/**
 * Zod schemas for validating LLM JSON output for Standard Questions 1-4.
 */

import { z } from 'zod';

/** Increment when schema shape changes — logged in qa_standard_runs.schema_version */
export const SCHEMA_VERSION = '1.0.0';

// SQ1: Sales Priority Score
export const SQ1Schema = z.object({
  SCORE_TEXT: z.string(),
  SCORE_VALUE: z.union([
    z.number().int().min(1).max(5),
    z.string().regex(/^[1-5]$/).transform(Number),
    z.literal('NULL').transform(() => null),
    z.null(),
  ]),
});
export type SQ1Output = z.infer<typeof SQ1Schema>;

// SQ2: Market Segmentation
// Keys are dynamic dimension names; "Evidence" is always a string array
export const SQ2Schema = z
  .object({
    Evidence: z.array(z.string()),
  })
  .catchall(z.union([z.string(), z.array(z.string())]));
export type SQ2Output = z.infer<typeof SQ2Schema>;

// SQ3: Account Intelligence Brief
export const SQ3Schema = z.object({
  'Company Snapshot': z.string(),
  'Target Customers & Markets': z.array(z.string()),
  'Organizational Buying Context': z.array(z.string()),
  'Strategic Focus Indicators': z.array(z.string()),
  'Positioning & Differentiation Signals': z.array(z.string()),
  'Commercial Entry Points': z.array(z.string()),
  'Suggested Conversation Angle': z.string(),
  'Key Website Evidence': z.array(z.string()),
});
export type SQ3Output = z.infer<typeof SQ3Schema>;

// SQ4: Personalised Outreach Message
export const SQ4Schema = z.object({
  message: z.string(),
});
export type SQ4Output = z.infer<typeof SQ4Schema>;

export const SQ_SCHEMAS = {
  '1': SQ1Schema,
  '2': SQ2Schema,
  '3': SQ3Schema,
  '4': SQ4Schema,
} as const;

export type SQId = keyof typeof SQ_SCHEMAS;

/**
 * Attempts to extract and parse the first JSON object from a raw LLM string.
 * Handles trailing text and markdown code fences.
 */
export function extractJson(raw: string): unknown {
  // Strip markdown code fences
  let text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Find the first { ... } block
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in LLM output');

  // Walk forward to find the matching closing brace
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error('Unmatched braces in LLM output');

  const jsonStr = text.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

/**
 * Validates raw LLM output against the schema for a given standard question ID.
 * Returns the parsed, typed output.
 */
export function parseStandardOutput(standardQuestionId: SQId, raw: string) {
  const json = extractJson(raw);
  const schema = SQ_SCHEMAS[standardQuestionId];
  return schema.parse(json);
}
