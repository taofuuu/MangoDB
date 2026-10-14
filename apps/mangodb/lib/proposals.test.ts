/*
 * Tests for lib/proposals.ts helpers behind the Your Proposals page (US2-9).
 *
 * formatProposalDateTime: the "dd/mm/yyyy hh:mm" stamp on each card.
 * - Day, month, hour and minute are zero-padded, so every card's date has the
 *   same width and lines up in the list.
 * - The time is the viewer's local time, not UTC. The API sends createdAt in
 *   UTC; a Thai user should see Thai time. The input is built from local date
 *   parts, so the test passes in any time zone.
 * - Hours are 24-hour: 15:30, not 03:30.
 *
 * getMyProposalCounts: the numbers on the Total / Pending / Accepted /
 * Rejected chips.
 * - Each number is pagination.totalItems of a 1-item page for that status,
 *   and Total is the unfiltered request, not a sum. So the API stays
 *   { items, pagination } (docs/conventions.md §3).
 * - A status with no proposals reads as 0, not missing.
 * - The list call is faked (passed in), so no request leaves the test.
 *
 * Run: node --import tsx --test lib/proposals.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposalListResponse } from '@mangodb/shared';
import {
    formatProposalDateTime,
    getMyProposalCounts,
    type GetMyProposalsOptions,
} from './proposals';

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

describe('getMyProposalCounts', () => {
    // A fake listMyProposals that answers from a table of totals per status
    // and records each call it gets.
    function fakeList(totals: Record<string, number>) {
        const calls: {
            page: number;
            pageSize: number;
            status?: string | undefined;
        }[] = [];
        const list = async (
            page = 1,
            pageSize = 6,
            options?: GetMyProposalsOptions,
        ): Promise<ProposalListResponse> => {
            calls.push({ page, pageSize, status: options?.status });
            const totalItems = totals[options?.status ?? 'ALL'] ?? 0;
            return {
                items: [],
                pagination: {
                    page,
                    pageSize,
                    totalItems,
                    totalPages: Math.ceil(totalItems / pageSize),
                },
            };
        };
        return { list, calls };
    }

    it('reads each chip from totalItems of its own filter', async () => {
        const { list } = fakeList({
            ALL: 10,
            PENDING: 5,
            ACCEPTED: 3,
            REJECTED: 2,
        });

        assert.deepEqual(await getMyProposalCounts(list), {
            total: 10,
            pending: 5,
            accepted: 3,
            rejected: 2,
        });
    });

    it('gives 0 for a status with no proposals', async () => {
        const { list } = fakeList({ ALL: 4, PENDING: 4 });

        assert.deepEqual(await getMyProposalCounts(list), {
            total: 4,
            pending: 4,
            accepted: 0,
            rejected: 0,
        });
    });

    it('asks for one item per status, not whole pages', async () => {
        const { list, calls } = fakeList({});

        await getMyProposalCounts(list);

        assert.deepEqual(
            calls.map((call) => call.status),
            [undefined, 'PENDING', 'ACCEPTED', 'REJECTED'],
        );
        for (const call of calls) {
            assert.equal(call.page, 1);
            assert.equal(call.pageSize, 1);
        }
    });
});
