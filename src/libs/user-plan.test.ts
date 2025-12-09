import { describe, expect,it } from 'vitest';

import type { UserPlan } from '@/libs/user-plan';
import { getPlanCap, getVisibleColumns, maskFields } from '@/libs/user-plan';

describe('user-plan', () => {
    describe('getPlanCap', () => {
        it('should return 100 for small plan', () => {
            expect(getPlanCap('small')).toBe(100);
        });

        it('should return 500 for medium plan', () => {
            expect(getPlanCap('medium')).toBe(500);
        });

        it('should return 5000 for large plan', () => {
            expect(getPlanCap('large')).toBe(5000);
        });

        it('should return 100 for null plan (free tier)', () => {
            expect(getPlanCap(null)).toBe(100);
        });
    });

    describe('getVisibleColumns', () => {
        it('should return basic columns for free tier', () => {
            const columns = getVisibleColumns(null);
            expect(columns).toEqual(['name', 'city', 'sectors', 'experience_years']);
        });

        it('should return small plan columns', () => {
            const columns = getVisibleColumns('small');
            expect(columns).toEqual(['name', 'city', 'street', 'sectors', 'experience_years']);
            expect(columns).not.toContain('email');
            expect(columns).not.toContain('phone');
        });

        it('should return medium plan columns with email and phone', () => {
            const columns = getVisibleColumns('medium');
            expect(columns).toContain('email');
            expect(columns).toContain('phone');
            expect(columns).not.toContain('similarity');
        });

        it('should return large plan columns with all fields', () => {
            const columns = getVisibleColumns('large');
            expect(columns).toContain('email');
            expect(columns).toContain('phone');
            expect(columns).toContain('similarity');
        });
    });

    describe('maskFields', () => {
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

        it('should mask fields for free tier', () => {
            const masked = maskFields([mockItem], null);
            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('city');
            expect(masked[0]).not.toHaveProperty('email');
            expect(masked[0]).not.toHaveProperty('phone');
            expect(masked[0]).not.toHaveProperty('similarity');
        });

        it('should mask fields for small plan', () => {
            const masked = maskFields([mockItem], 'small');
            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).toHaveProperty('street');
            expect(masked[0]).not.toHaveProperty('email');
            expect(masked[0]).not.toHaveProperty('phone');
        });

        it('should show email and phone for medium plan', () => {
            const masked = maskFields([mockItem], 'medium');
            expect(masked[0]).toHaveProperty('email');
            expect(masked[0]).toHaveProperty('phone');
            expect(masked[0]).not.toHaveProperty('similarity');
        });

        it('should show all fields for large plan', () => {
            const masked = maskFields([mockItem], 'large');
            expect(masked[0]).toHaveProperty('email');
            expect(masked[0]).toHaveProperty('phone');
            expect(masked[0]).toHaveProperty('similarity');
        });

        it('should always preserve doc_id', () => {
            const plans: UserPlan[] = [null, 'small', 'medium', 'large'];
            plans.forEach(plan => {
                const masked = maskFields([mockItem], plan);
                expect(masked[0]).toHaveProperty('doc_id', 'test-123');
            });
        });

        it('should handle multiple items', () => {
            const items = [mockItem, { ...mockItem, doc_id: 'test-456', name: 'Jane Doe' }];
            const masked = maskFields(items, 'small');
            expect(masked).toHaveLength(2);
            expect(masked[0].doc_id).toBe('test-123');
            expect(masked[1].doc_id).toBe('test-456');
        });

        it('should handle items with missing fields', () => {
            const itemWithMissingFields = {
                doc_id: 'test-789',
                name: 'Bob Smith',
                city: 'Manchester',
                // missing email, phone, etc.
            };
            const masked = maskFields([itemWithMissingFields], 'large');
            expect(masked[0]).toHaveProperty('doc_id');
            expect(masked[0]).toHaveProperty('name');
            expect(masked[0]).not.toHaveProperty('email'); // not in source
        });
    });
});
