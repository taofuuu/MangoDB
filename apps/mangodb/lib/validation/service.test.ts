/*
 * Tests for validateServiceDuration, the service form's estimated duration.
 * - The field is optional, so a blank box is fine.
 * - Months in steps of 0.5, at most 120, as a proposal duration (ADR 0007).
 *
 * Run: node --import tsx --test lib/validation/service.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateServiceDuration } from './service';

describe('validateServiceDuration', () => {
    it('lets the box stay blank', () => {
        assert.equal(validateServiceDuration(''), null);
        assert.equal(validateServiceDuration('   '), null);
    });

    it('accepts whole and half months', () => {
        assert.equal(validateServiceDuration('0.5'), null);
        assert.equal(validateServiceDuration('3'), null);
        assert.equal(validateServiceDuration(' 1.5 '), null);
        assert.equal(validateServiceDuration('120'), null);
    });

    it('refuses text that is not a number', () => {
        assert.equal(
            validateServiceDuration('three'),
            'Duration must be a valid number.',
        );
    });

    it('refuses numbers not written as plain decimals', () => {
        for (const value of ['1e1', '0x2', '.5', '1.', '+1', '1,5']) {
            assert.equal(
                validateServiceDuration(value),
                'Duration must be a valid number.',
                value,
            );
        }
    });

    it('refuses zero and below', () => {
        assert.equal(
            validateServiceDuration('0'),
            'Duration must be greater than zero.',
        );
        assert.equal(
            validateServiceDuration('-1'),
            'Duration must be greater than zero.',
        );
    });

    it('refuses more than 120 months', () => {
        assert.equal(
            validateServiceDuration('120.5'),
            'Duration cannot exceed 120 months.',
        );
    });

    it('refuses steps finer than half a month', () => {
        assert.equal(
            validateServiceDuration('1.25'),
            'Duration must be in half-month steps (e.g. 0.5, 1, 1.5).',
        );
    });
});
