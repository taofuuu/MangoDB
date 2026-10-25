/*
 * Tests for companyProfileHref in lib/profileLinks.ts: where the Provider's
 * name on a service detail links to (T3.7.1).
 *
 * - Another company's name opens its public profile, /companies/[companyId].
 * - Your own name opens your own profile, /profile/view, so you land on the
 *   page you can edit instead of the read-only copy.
 * - While the signed-in company is still loading (null), the link is the
 *   public profile: it is the right page for everyone but the owner.
 *
 * Run: node --import tsx --test lib/profileLinks.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { companyProfileHref } from './profileLinks';

describe('companyProfileHref', () => {
    it("links another company's name to its public profile", () => {
        assert.equal(companyProfileHref(42, 7), '/companies/42');
    });

    it('links your own name to your own profile', () => {
        assert.equal(companyProfileHref(7, 7), '/profile/view');
    });

    it('links to the public profile while the viewer is unknown', () => {
        assert.equal(companyProfileHref(42, null), '/companies/42');
    });
});
