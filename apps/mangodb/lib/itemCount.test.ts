/*
 * Tests for formatItemCount in lib/itemCount.ts: the "N items" text in the
 * search result count on Search jobs, Search services and Explore companies.
 *
 * - One result is "1 item", not "1 items" (issue #266).
 * - Zero and many use the plural: "0 items", "2 items". English uses the
 *   plural for zero, so only exactly 1 is singular.
 *
 * Run: node --import tsx --test lib/itemCount.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatItemCount } from './itemCount';

describe('formatItemCount', () => {
    it('uses the singular for one item', () => {
        assert.equal(formatItemCount(1), '1 item');
    });

    it('uses the plural for zero items', () => {
        assert.equal(formatItemCount(0), '0 items');
    });

    it('uses the plural for many items', () => {
        assert.equal(formatItemCount(2), '2 items');
        assert.equal(formatItemCount(25), '25 items');
    });
});
