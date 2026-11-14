/*
 * Tests for lib/sentences.ts, which ends a sentence that finishes with a name.
 *
 * Company names often end in "Co." or "Ltd.". The receipts and the
 * project-completed pop-up put a period after the name, so "Demo Receiver Co."
 * became "Demo Receiver Co..". endSentence adds the period only when the text
 * does not already end with one (or with ! or ?).
 *
 * Run: node --import tsx --test lib/sentences.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { endSentence } from './sentences';

describe('endSentence', () => {
    it('adds a period after a plain name', () => {
        assert.equal(endSentence('Acme'), 'Acme.');
    });

    it('keeps a single period when the name already ends with one', () => {
        assert.equal(endSentence('Demo Receiver Co.'), 'Demo Receiver Co.');
    });

    it('adds no period after a name ending in ! or ?', () => {
        assert.equal(endSentence('Yahoo!'), 'Yahoo!');
        assert.equal(endSentence('Why Not?'), 'Why Not?');
    });

    it('adds a period when the dot is not at the end', () => {
        assert.equal(endSentence('A.B Studio'), 'A.B Studio.');
    });
});
