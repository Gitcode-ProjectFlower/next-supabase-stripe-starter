import { describe, it, expect } from 'vitest';
import { extractJson, parseStandardOutput, SCHEMA_VERSION } from '../qa-output-schemas';

describe('SCHEMA_VERSION', () => {
  it('is defined', () => {
    expect(SCHEMA_VERSION).toBe('1.0.0');
  });
});

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fence (```json)', () => {
    const raw = '```json\n{"a":1}\n```';
    expect(extractJson(raw)).toEqual({ a: 1 });
  });

  it('strips plain ``` fence', () => {
    const raw = '```\n{"a":1}\n```';
    expect(extractJson(raw)).toEqual({ a: 1 });
  });

  it('ignores trailing text after closing brace', () => {
    const raw = '{"a":1} some trailing text here';
    expect(extractJson(raw)).toEqual({ a: 1 });
  });

  it('ignores leading text before opening brace', () => {
    const raw = 'Here is the result: {"a":1}';
    expect(extractJson(raw)).toEqual({ a: 1 });
  });

  it('handles nested objects', () => {
    const raw = '{"a":{"b":{"c":3}}}';
    expect(extractJson(raw)).toEqual({ a: { b: { c: 3 } } });
  });

  it('throws if no JSON object found', () => {
    expect(() => extractJson('no json here')).toThrow('No JSON object found');
  });

  it('throws on unmatched braces', () => {
    expect(() => extractJson('{"a":1')).toThrow('Unmatched braces');
  });
});

describe('parseStandardOutput — SQ1', () => {
  it('parses valid SQ1 with number SCORE_VALUE', () => {
    const raw = JSON.stringify({ SCORE_TEXT: 'Good fit', SCORE_VALUE: 4 });
    const result = parseStandardOutput('1', raw);
    expect(result.SCORE_TEXT).toBe('Good fit');
    expect(result.SCORE_VALUE).toBe(4);
  });

  it('parses SQ1 with string SCORE_VALUE and coerces to number', () => {
    const raw = JSON.stringify({ SCORE_TEXT: 'Good fit', SCORE_VALUE: '3' });
    const result = parseStandardOutput('1', raw);
    expect(result.SCORE_VALUE).toBe(3);
  });

  it('throws on SCORE_VALUE out of range', () => {
    const raw = JSON.stringify({ SCORE_TEXT: 'x', SCORE_VALUE: 6 });
    expect(() => parseStandardOutput('1', raw)).toThrow();
  });

  it('throws on missing SCORE_TEXT', () => {
    const raw = JSON.stringify({ SCORE_VALUE: 3 });
    expect(() => parseStandardOutput('1', raw)).toThrow();
  });
});

describe('parseStandardOutput — SQ2', () => {
  it('parses valid SQ2 with dynamic keys', () => {
    const raw = JSON.stringify({
      Evidence: ['Website shows B2B focus'],
      'Customer Type': 'Enterprise',
      'Market Segment': ['SaaS', 'Fintech'],
    });
    const result = parseStandardOutput('2', raw);
    expect(result.Evidence).toEqual(['Website shows B2B focus']);
    expect((result as any)['Customer Type']).toBe('Enterprise');
  });

  it('throws if Evidence is missing', () => {
    const raw = JSON.stringify({ 'Customer Type': 'SMB' });
    expect(() => parseStandardOutput('2', raw)).toThrow();
  });
});

describe('parseStandardOutput — SQ3', () => {
  const validSQ3 = {
    'Company Snapshot': 'A global SaaS company.',
    'Target Customers & Markets': ['Enterprise', 'SMB'],
    'Organizational Buying Context': ['IT decision maker'],
    'Strategic Focus Indicators': ['Cloud migration'],
    'Positioning & Differentiation Signals': ['Low cost'],
    'Commercial Entry Points': ['Digital transformation budget'],
    'Suggested Conversation Angle': 'Focus on ROI',
    'Key Website Evidence': ['careers page shows rapid growth'],
  };

  it('parses valid SQ3', () => {
    const result = parseStandardOutput('3', JSON.stringify(validSQ3));
    expect(result['Company Snapshot']).toBe('A global SaaS company.');
    expect(result['Target Customers & Markets']).toEqual(['Enterprise', 'SMB']);
  });

  it('throws if required key missing', () => {
    const { 'Company Snapshot': _removed, ...partial } = validSQ3;
    expect(() => parseStandardOutput('3', JSON.stringify(partial))).toThrow();
  });
});

describe('parseStandardOutput — SQ4', () => {
  it('parses valid SQ4', () => {
    const raw = JSON.stringify({ message: 'Hi, I noticed your company...' });
    const result = parseStandardOutput('4', raw);
    expect(result.message).toBe('Hi, I noticed your company...');
  });

  it('throws if message missing', () => {
    const raw = JSON.stringify({ text: 'wrong key' });
    expect(() => parseStandardOutput('4', raw)).toThrow();
  });
});

describe('parseStandardOutput — markdown fence integration', () => {
  it('handles code-fenced SQ1 output from LLM', () => {
    const raw = '```json\n{"SCORE_TEXT":"Strong fit","SCORE_VALUE":5}\n```';
    const result = parseStandardOutput('1', raw);
    expect(result.SCORE_VALUE).toBe(5);
  });

  it('handles trailing explanation text in SQ4 output', () => {
    const raw = '{"message":"Hello!"} This message is tailored to your profile.';
    const result = parseStandardOutput('4', raw);
    expect(result.message).toBe('Hello!');
  });
});
