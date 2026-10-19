/*
 * Tests for lib/dates.ts, the one place dates become text.
 *
 * formatDateTime: the "dd/mm/yyyy hh:mm" stamp on each proposal card.
 * - Day, month, hour and minute are zero-padded, so every card's date has the
 *   same width and lines up in the list.
 * - The time is the viewer's local time, not UTC. The API sends createdAt in
 *   UTC; a Thai user should see Thai time. The input is built from local date
 *   parts, so the test passes in any time zone.
 * - Hours are 24-hour: 15:30, not 03:30.
 *
 * formatDateOnly: a date column keeps its day in every time zone, because it
 * is split rather than parsed.
 *
 * Run: node --import tsx --test lib/dates.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDateOnly, formatDateTime, formatMonthYear } from './dates';

describe('formatDateTime', () => {
    it('zero-pads every part', () => {
        const iso = new Date(2026, 0, 5, 9, 7).toISOString();

        assert.equal(formatDateTime(iso), '05/01/2026 09:07');
    });

    it('uses a 24-hour clock', () => {
        const iso = new Date(2026, 11, 25, 15, 30).toISOString();

        assert.equal(formatDateTime(iso), '25/12/2026 15:30');
    });
});

describe('formatDateOnly', () => {
    it('shows the stored day with a short month', () => {
        assert.equal(formatDateOnly('2026-09-01'), '1 Sep 2026');
    });
});

describe('formatMonthYear', () => {
    it('keeps whichever part was filled in', () => {
        assert.equal(formatMonthYear(5, 2024), 'May 2024');
        assert.equal(formatMonthYear(null, 2024), '2024');
        assert.equal(formatMonthYear(null, null), '');
    });
});
