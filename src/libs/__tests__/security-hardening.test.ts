import { describe, expect, it } from 'vitest';

import { downloadTypeLabel } from '../download-label';
import { toSafeExternalUrl } from '@/utils/safe-url';

describe('download labels', () => {
  it('labels combined workbooks separately from per-run files', () => {
    expect(downloadTypeLabel('qa', 'https://cdn/exports/u/s/combined_s_123.xlsx?token=x')).toBe('Combined Excel');
    expect(downloadTypeLabel('qa', 'https://cdn/exports/u/s/qa_s_123.xlsx?token=x')).toBe('Insights Excel');
    expect(downloadTypeLabel('lookalike', 'https://cdn/exports/u/s/lookalike.xlsx')).toBe('Lookalike Excel');
    expect(downloadTypeLabel('qa', null)).toBe('Insights Excel');
  });
});

describe('external url allowlist', () => {
  it('allows http and https links', () => {
    expect(toSafeExternalUrl('https://www.linkedin.com/company/acme')).toBe('https://www.linkedin.com/company/acme');
    expect(toSafeExternalUrl('http://example.com')).toBe('http://example.com');
  });

  it('rejects executable and non-web schemes', () => {
    expect(toSafeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeExternalUrl('JaVaScRiPt:alert(1)')).toBeNull();
    expect(toSafeExternalUrl('data:text/html,<h1>x</h1>')).toBeNull();
    expect(toSafeExternalUrl('ftp://example.com')).toBeNull();
    expect(toSafeExternalUrl('')).toBeNull();
    expect(toSafeExternalUrl(null)).toBeNull();
    expect(toSafeExternalUrl(undefined)).toBeNull();
    expect(toSafeExternalUrl(42)).toBeNull();
  });
});
