/*
 * Tests for formatProposalDateTime in lib/proposals.ts: the "dd/mm/yyyy hh:mm"
 * stamp on each card of the Your Proposals page.
 *
 * What they cover:
 * - Day, month, hour and minute are zero-padded, so every card's date has the
 *   same width and lines up in the list.
 * - The time is the viewer's local time, not UTC. The API sends createdAt in
 *   UTC; a Thai user should see Thai time. The input is built from local date
 *   parts, so the test passes in any time zone.
 * - Hours are 24-hour: 15:30, not 03:30.
 *
 * Run: node --import tsx --test lib/proposals.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatProposalDateTime } from './proposals';

describe('formatProposalDateTime', () => {
    it('zero-pads every part', () => {
        const iso = new Date(2026, 0, 5, 9, 7).toISOString();

        assert.equal(formatProposalDateTime(iso), '05/01/2026 09:07');
    });

    it('uses a 24-hour clock', () => {
        const iso = new Date(2026, 11, 25, 15, 30).toISOString();

        assert.equal(formatProposalDateTime(iso), '25/12/2026 15:30');
    });
});
