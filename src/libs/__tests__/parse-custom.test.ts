import { describe, it, expect } from 'vitest';
import { parseCustomAnswer } from '../parse-custom';

describe('parseCustomAnswer', () => {
  it('parses English labels', () => {
    const text = '**Answer** - Yes it fits.\n**Evidence** - Website says logistics.';
    const r = parseCustomAnswer(text);
    expect(r.answer).toBe('Yes it fits.');
    expect(r.evidence).toBe('Website says logistics.');
    expect(Object.keys(r).sort()).toEqual(['answer', 'evidence']);
  });

  it('parses Dutch labels into separate columns', () => {
    const text = '**Antwoord** - Past goed.\n**Bewijs** - Website zegt logistiek.';
    const r = parseCustomAnswer(text);
    expect(r.answer).toBe('Past goed.');
    expect(r.evidence).toBe('Website zegt logistiek.');
  });

  it('parses German labels', () => {
    const text = '**Antwort** - Passt gut.\n**Nachweise** - Webseite sagt Logistik.';
    const r = parseCustomAnswer(text);
    expect(r.answer).toBe('Passt gut.');
    expect(r.evidence).toBe('Webseite sagt Logistik.');
  });

  it('keeps content in the question language', () => {
    const text = 'Answer: Het bedrijf past goed.\nEvidence: De website vermeldt magazijnen.';
    const r = parseCustomAnswer(text);
    expect(r.answer).toContain('Het bedrijf');
    expect(r.evidence).toContain('magazijnen');
  });

  it('falls back to full text when no labels found', () => {
    const r = parseCustomAnswer('Just some plain text with no section headers.');
    expect(r.answer).toBe('Just some plain text with no section headers.');
    expect(r.evidence).toBe('');
  });
});
