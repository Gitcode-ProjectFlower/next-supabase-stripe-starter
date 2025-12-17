import { describe, expect, it } from 'vitest';
import type { UserPlan } from '../plan-config';
import { getTopKLimit } from '../plan-config';
import {
  canExportCSV,
  canGenerateQA,
  canSaveSelection,
  canScrollBeyondPreview,
  getMaxVisibleResults,
  requiresUpgrade,
} from '../soft-gating';
import { getAnonymousPlan, getVisibleColumns, maskFields } from '../user-plan';

describe('Anonymous Access', () => {
  describe('getAnonymousPlan', () => {
    it('should return anonymous plan', () => {
      const plan = getAnonymousPlan();
      expect(plan).toBe('anonymous');
    });
  });

  describe('getTopKLimit for anonymous users', () => {
    it('should return 3 as limit for anonymous plan', () => {
      const limit = getTopKLimit('anonymous');
      expect(limit).toBe(3);
    });

    it('should return 3 as limit for null plan (treated as anonymous)', () => {
      const limit = getTopKLimit(null);
      expect(limit).toBe(3);
    });
  });

  describe('getVisibleColumns for anonymous users', () => {
    it('should return only basic columns for anonymous plan', () => {
      const columns = getVisibleColumns('anonymous');
      expect(columns).toEqual(['name', 'city', 'sectors', 'experience_years']);
      expect(columns).not.toContain('email');
      expect(columns).not.toContain('phone');
      expect(columns).not.toContain('street');
      expect(columns).not.toContain('similarity');
    });

    it('should return basic columns for null plan (treated as anonymous)', () => {
      const columns = getVisibleColumns(null);
      expect(columns).toEqual(['name', 'city', 'sectors', 'experience_years']);
    });
  });

  describe('maskFields for anonymous users', () => {
    const mockItem = {
      doc_id: 'test-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+44 7700 123456',
      city: 'London',
      street: '123 Test St',
      sectors: ['technology'],
      experience_years: 10,
      similarity: 0.95,
    };

    it('should mask sensitive fields for anonymous plan', () => {
      const masked = maskFields([mockItem], 'anonymous');

      expect(masked[0]).toHaveProperty('doc_id', 'test-123');
      expect(masked[0]).toHaveProperty('name', 'John Doe');
      expect(masked[0]).toHaveProperty('city', 'London');
      expect(masked[0]).toHaveProperty('sectors', ['technology']);
      expect(masked[0]).toHaveProperty('experience_years', 10);

      // Should not include sensitive fields
      expect(masked[0]).not.toHaveProperty('email');
      expect(masked[0]).not.toHaveProperty('phone');
      expect(masked[0]).not.toHaveProperty('street');
      expect(masked[0]).not.toHaveProperty('similarity');
    });

    it('should mask sensitive fields for null plan (treated as anonymous)', () => {
      const masked = maskFields([mockItem], null);

      expect(masked[0]).toHaveProperty('doc_id');
      expect(masked[0]).toHaveProperty('name');
      expect(masked[0]).not.toHaveProperty('email');
      expect(masked[0]).not.toHaveProperty('phone');
    });

    it('should always preserve doc_id even for anonymous users', () => {
      const masked = maskFields([mockItem], 'anonymous');
      expect(masked[0].doc_id).toBe('test-123');
    });

    it('should handle multiple items for anonymous users', () => {
      const items = [mockItem, { ...mockItem, doc_id: 'test-456', name: 'Jane Doe' }];
      const masked = maskFields(items, 'anonymous');

      expect(masked).toHaveLength(2);
      expect(masked[0].doc_id).toBe('test-123');
      expect(masked[1].doc_id).toBe('test-456');
      expect(masked[0]).not.toHaveProperty('email');
      expect(masked[1]).not.toHaveProperty('email');
    });
  });

  describe('canSaveSelection for anonymous users', () => {
    it('should return false for anonymous plan', () => {
      expect(canSaveSelection('anonymous')).toBe(false);
    });

    it('should return false for null plan', () => {
      expect(canSaveSelection(null)).toBe(false);
    });

    it('should return true for authenticated plans', () => {
      expect(canSaveSelection('free_tier')).toBe(true);
      expect(canSaveSelection('small')).toBe(true);
      expect(canSaveSelection('medium')).toBe(true);
      expect(canSaveSelection('large')).toBe(true);
    });
  });

  describe('canGenerateQA for anonymous users', () => {
    it('should return false for anonymous plan', () => {
      expect(canGenerateQA('anonymous')).toBe(false);
    });

    it('should return false for null plan', () => {
      expect(canGenerateQA(null)).toBe(false);
    });

    it('should return true for authenticated plans', () => {
      expect(canGenerateQA('free_tier')).toBe(true);
      expect(canGenerateQA('small')).toBe(true);
    });
  });

  describe('canScrollBeyondPreview for anonymous users', () => {
    it('should return false for anonymous plan', () => {
      expect(canScrollBeyondPreview('anonymous')).toBe(false);
    });

    it('should return false for null plan', () => {
      expect(canScrollBeyondPreview(null)).toBe(false);
    });

    it('should return true for authenticated plans', () => {
      expect(canScrollBeyondPreview('free_tier')).toBe(true);
    });
  });

  describe('canExportCSV for anonymous users', () => {
    it('should return false for anonymous plan', () => {
      expect(canExportCSV('anonymous')).toBe(false);
    });

    it('should return false for null plan', () => {
      expect(canExportCSV(null)).toBe(false);
    });

    it('should return true for authenticated plans', () => {
      expect(canExportCSV('free_tier')).toBe(true);
      expect(canExportCSV('medium')).toBe(true);
    });
  });

  describe('getMaxVisibleResults for anonymous users', () => {
    it('should return 3 for anonymous plan', () => {
      expect(getMaxVisibleResults('anonymous')).toBe(3);
    });

    it('should return 3 for null plan', () => {
      expect(getMaxVisibleResults(null)).toBe(3);
    });

    it('should return 10000 for authenticated plans', () => {
      expect(getMaxVisibleResults('free_tier')).toBe(10000);
      expect(getMaxVisibleResults('small')).toBe(10000);
      expect(getMaxVisibleResults('medium')).toBe(10000);
      expect(getMaxVisibleResults('large')).toBe(10000);
    });
  });

  describe('requiresUpgrade for anonymous users', () => {
    it('should return true for all features when plan is anonymous', () => {
      expect(requiresUpgrade('anonymous', 'save')).toBe(true);
      expect(requiresUpgrade('anonymous', 'qa')).toBe(true);
      expect(requiresUpgrade('anonymous', 'scroll')).toBe(true);
      expect(requiresUpgrade('anonymous', 'export')).toBe(true);
    });

    it('should return true for all features when plan is null', () => {
      expect(requiresUpgrade(null, 'save')).toBe(true);
      expect(requiresUpgrade(null, 'qa')).toBe(true);
      expect(requiresUpgrade(null, 'scroll')).toBe(true);
      expect(requiresUpgrade(null, 'export')).toBe(true);
    });

    it('should return false for authenticated users with valid plans', () => {
      expect(requiresUpgrade('free_tier', 'save')).toBe(false);
      expect(requiresUpgrade('free_tier', 'qa')).toBe(false);
      expect(requiresUpgrade('small', 'export')).toBe(false);
    });
  });

  describe('Anonymous user restrictions summary', () => {
    it('should enforce all restrictions consistently', () => {
      const anonymousPlan: UserPlan = 'anonymous';

      // All features should be blocked
      expect(canSaveSelection(anonymousPlan)).toBe(false);
      expect(canGenerateQA(anonymousPlan)).toBe(false);
      expect(canScrollBeyondPreview(anonymousPlan)).toBe(false);
      expect(canExportCSV(anonymousPlan)).toBe(false);

      // All features should require upgrade
      expect(requiresUpgrade(anonymousPlan, 'save')).toBe(true);
      expect(requiresUpgrade(anonymousPlan, 'qa')).toBe(true);
      expect(requiresUpgrade(anonymousPlan, 'scroll')).toBe(true);
      expect(requiresUpgrade(anonymousPlan, 'export')).toBe(true);

      // Limited results
      expect(getMaxVisibleResults(anonymousPlan)).toBe(3);
      expect(getTopKLimit(anonymousPlan)).toBe(3);
    });

    it('should treat null plan same as anonymous', () => {
      const nullPlan: UserPlan = null;

      expect(canSaveSelection(nullPlan)).toBe(canSaveSelection('anonymous'));
      expect(canGenerateQA(nullPlan)).toBe(canGenerateQA('anonymous'));
      expect(canScrollBeyondPreview(nullPlan)).toBe(canScrollBeyondPreview('anonymous'));
      expect(canExportCSV(nullPlan)).toBe(canExportCSV('anonymous'));
      expect(getMaxVisibleResults(nullPlan)).toBe(getMaxVisibleResults('anonymous'));
      expect(getTopKLimit(nullPlan)).toBe(getTopKLimit('anonymous'));
    });
  });
});
