import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateWorkRejectionReason } from './project';

describe('validateWorkRejectionReason', () => {
    it('requires a non-whitespace reason (T4.12.2)', () => {
        assert.equal(validateWorkRejectionReason(''), 'Please enter a reason.');
        assert.equal(
            validateWorkRejectionReason('   \n\t '),
            'Please enter a reason.',
        );
    });

    it('accepts a reason within the API limit', () => {
        assert.equal(
            validateWorkRejectionReason('The login page is not responsive.'),
            null,
        );
        assert.equal(validateWorkRejectionReason('a'.repeat(10000)), null);
    });

    it('rejects a reason beyond the API limit', () => {
        assert.equal(
            validateWorkRejectionReason('a'.repeat(10001)),
            'Reason cannot exceed 10000 characters.',
        );
    });
});
