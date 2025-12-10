import { describe, it, expect } from 'vitest';
import { maskFields, getVisibleColumns, getPlanCap } from '@/libs/user-plan';
import type { UserPlan } from '@/libs/user-plan';

describe('Integration: Field Masking by Plan', () => {
    const mockCandidate = {
        doc_id: 'test-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+44 7700 123456',
        city: 'London',
        street: '123 Test Street',
        sectors: ['technology', 'finance'],
        experience_years: 10,
        similarity: 0.95,
    };

    describe('Free tier masking', () => {
        it('should only show basic fields for free tier', () => {
            const masked = maskFields([mockCandidate], null);

            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('city');
            expect(masked[0]).toHaveProperty('sectors');
            expect(masked[0]).toHaveProperty('experience_years');

            expect(masked[0]).not.toHaveProperty('email');
            expect(masked[0]).not.toHaveProperty('phone');
            expect(masked[0]).not.toHaveProperty('street');
            expect(masked[0]).not.toHaveProperty('similarity');
        });

        it('should get correct visible columns for free tier', () => {
            const columns = getVisibleColumns(null);

            expect(columns).toContain('name');
            expect(columns).toContain('city');
            expect(columns).toContain('sectors');
            expect(columns).toContain('experience_years');
            expect(columns).not.toContain('email');
            expect(columns).not.toContain('phone');
        });
    });

    describe('Small plan masking', () => {
        it('should show basic fields + street for small plan', () => {
            const masked = maskFields([mockCandidate], 'small');

            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('city');
            expect(masked[0]).toHaveProperty('street');
            expect(masked[0]).toHaveProperty('sectors');
            expect(masked[0]).toHaveProperty('experience_years');

            expect(masked[0]).not.toHaveProperty('email');
            expect(masked[0]).not.toHaveProperty('phone');
            expect(masked[0]).not.toHaveProperty('similarity');
        });

        it('should have cap of 100 for small plan', () => {
            expect(getPlanCap('small')).toBe(100);
        });
    });

    describe('Medium plan masking', () => {
        it('should show all fields except similarity for medium plan', () => {
            const masked = maskFields([mockCandidate], 'medium');

            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('email');
            expect(masked[0]).toHaveProperty('phone');
            expect(masked[0]).toHaveProperty('city');
            expect(masked[0]).toHaveProperty('street');
            expect(masked[0]).toHaveProperty('sectors');
            expect(masked[0]).toHaveProperty('experience_years');

            expect(masked[0]).not.toHaveProperty('similarity');
        });

        it('should have cap of 500 for medium plan', () => {
            expect(getPlanCap('medium')).toBe(500);
        });
    });

    describe('Large plan masking', () => {
        it('should show all fields including similarity for large plan', () => {
            const masked = maskFields([mockCandidate], 'large');

            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('email');
            expect(masked[0]).toHaveProperty('phone');
            expect(masked[0]).toHaveProperty('city');
            expect(masked[0]).toHaveProperty('street');
            expect(masked[0]).toHaveProperty('sectors');
            expect(masked[0]).toHaveProperty('experience_years');
            expect(masked[0]).toHaveProperty('similarity');
        });

        it('should have cap of 5000 for large plan', () => {
            expect(getPlanCap('large')).toBe(5000);
        });
    });

    describe('Masking consistency', () => {
        it('should always preserve doc_id regardless of plan', () => {
            const plans: UserPlan[] = [null, 'small', 'medium', 'large'];

            plans.forEach(plan => {
                const masked = maskFields([mockCandidate], plan);
                expect(masked[0]).toHaveProperty('doc_id', 'test-123');
            });
        });

        it('should handle multiple candidates consistently', () => {
            const candidates = [
                { ...mockCandidate, doc_id: 'doc-1', name: 'Alice' },
                { ...mockCandidate, doc_id: 'doc-2', name: 'Bob' },
                { ...mockCandidate, doc_id: 'doc-3', name: 'Charlie' },
            ];

            const masked = maskFields(candidates, 'small');

            expect(masked).toHaveLength(3);
            masked.forEach(item => {
                expect(item).toHaveProperty('doc_id');
                expect(item).toHaveProperty('name');
                expect(item).not.toHaveProperty('email');
            });
        });

        it('should handle missing fields gracefully', () => {
            const incompleteCandidate = {
                doc_id: 'incomplete-1',
                name: 'Incomplete User',
                city: 'London',
                // Missing email, phone, etc.
            };

            const masked = maskFields([incompleteCandidate], 'large');

            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('city');
            expect(masked[0]).not.toHaveProperty('email'); // Not in source
        });
    });

    describe('Plan progression', () => {
        it('should show progressively more fields as plan upgrades', () => {
            const freeMasked = maskFields([mockCandidate], null);
            const smallMasked = maskFields([mockCandidate], 'small');
            const mediumMasked = maskFields([mockCandidate], 'medium');
            const largeMasked = maskFields([mockCandidate], 'large');

            const freeKeys = Object.keys(freeMasked[0]);
            const smallKeys = Object.keys(smallMasked[0]);
            const mediumKeys = Object.keys(mediumMasked[0]);
            const largeKeys = Object.keys(largeMasked[0]);

            expect(smallKeys.length).toBeGreaterThan(freeKeys.length);
            expect(mediumKeys.length).toBeGreaterThan(smallKeys.length);
            expect(largeKeys.length).toBeGreaterThan(mediumKeys.length);
        });

        it('should have progressively higher caps as plan upgrades', () => {
            const freeCap = getPlanCap(null);
            const smallCap = getPlanCap('small');
            const mediumCap = getPlanCap('medium');
            const largeCap = getPlanCap('large');

            expect(smallCap).toBeGreaterThanOrEqual(freeCap);
            expect(mediumCap).toBeGreaterThan(smallCap);
            expect(largeCap).toBeGreaterThan(mediumCap);
        });
    });

    describe('Search results masking', () => {
        it('should apply masking to search results', () => {
            const searchResults = [
                { ...mockCandidate, doc_id: 'search-1', similarity: 0.95 },
                { ...mockCandidate, doc_id: 'search-2', similarity: 0.90 },
                { ...mockCandidate, doc_id: 'search-3', similarity: 0.85 },
            ];

            const masked = maskFields(searchResults, 'small');

            masked.forEach(result => {
                expect(result).not.toHaveProperty('similarity');
                expect(result).not.toHaveProperty('email');
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('doc_id');
            });
        });
    });
});
