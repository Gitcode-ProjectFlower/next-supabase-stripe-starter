import { describe, expect, it } from 'vitest';

import { getAllowedFilterKeys, getTopKLimit, validateFilterKeys } from '@/libs/facet-config';

describe('facet-config', () => {
  describe('getAllowedFilterKeys', () => {
    it('should return an array of allowed filter keys', () => {
      const keys = getAllowedFilterKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should include expected filter keys', () => {
      const keys = getAllowedFilterKeys();
      expect(keys).toContain('sector');
      expect(keys).toContain('region');
      expect(keys).toContain('experience_years');
    });
  });

  describe('validateFilterKeys', () => {
    it('should accept valid filter keys', () => {
      const validFilters = {
        sector: ['technology'],
        region: ['London'],
        experience_years: [5, 10],
      };
      expect(validateFilterKeys(validFilters)).toBe(true);
    });

    it('should reject invalid filter keys', () => {
      const invalidFilters = {
        invalid_key: ['value'],
        another_invalid: ['value'],
      };
      expect(validateFilterKeys(invalidFilters)).toBe(false);
    });

    it('should reject mixed valid and invalid keys', () => {
      const mixedFilters = {
        sector: ['technology'],
        invalid_key: ['value'],
      };
      expect(validateFilterKeys(mixedFilters)).toBe(false);
    });

    it('should accept empty filters object', () => {
      expect(validateFilterKeys({})).toBe(true);
    });

    it('should accept filters with empty arrays', () => {
      const filtersWithEmptyArrays = {
        sector: [],
        region: [],
      };
      expect(validateFilterKeys(filtersWithEmptyArrays)).toBe(true);
    });
  });

  describe('getTopKLimit', () => {
    it('should return 100 for small plan', () => {
      expect(getTopKLimit('small')).toBe(100);
    });

    it('should return 500 for medium plan', () => {
      expect(getTopKLimit('medium')).toBe(500);
    });

    it('should return 5000 for large plan', () => {
      expect(getTopKLimit('large')).toBe(5000);
    });
  });
});
