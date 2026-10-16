/*
 * Tests for ownProfileListingTabs in lib/roles.ts: which listing tabs your own
 * profile's ServicesSection shows.
 *
 * - A PROVIDER-only company only offers work, so it gets the Services tab
 *   alone. It cannot post job listings, so a Job Listing tab would always be
 *   empty.
 * - A BOTH company offers and requests work, so it gets Services and then
 *   Job Listing, in that order (Services is the tab that opens first).
 * - A RECEIVER-only company never reaches ServicesSection (it gets
 *   ReceiverProfileView and its JobListing), but if it did, Job Listing is
 *   the only tab that fits it.
 * - An unknown account type gets no tabs: answering "none" is the safe way to
 *   be wrong, the same rule as isProviderAccount.
 *
 * Run: node --import tsx --test lib/roles.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ownProfileListingTabs } from './roles';

describe('ownProfileListingTabs', () => {
    it('gives a PROVIDER only the Services tab', () => {
        assert.deepEqual(ownProfileListingTabs('PROVIDER'), ['services']);
    });

    it('gives a BOTH company Services, then Job Listing', () => {
        assert.deepEqual(ownProfileListingTabs('BOTH'), ['services', 'jobs']);
    });

    it('gives a RECEIVER only the Job Listing tab', () => {
        assert.deepEqual(ownProfileListingTabs('RECEIVER'), ['jobs']);
    });

    it('gives an unknown account type no tabs', () => {
        assert.deepEqual(ownProfileListingTabs('ADMIN'), []);
        assert.deepEqual(ownProfileListingTabs('SOMETHING_NEW'), []);
    });
});
