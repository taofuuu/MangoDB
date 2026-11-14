/*
 * Tests for receiverAcceptedQuotationMessage in lib/quotationCopy.ts: the text
 * on the Receiver's Quotation card once the quotation is accepted (issue #267).
 *
 * - While the project is AWAITING_DEPOSIT and no deposit is reported, the
 *   Receiver still has to pay, so the card asks them to pay and report it.
 * - Once the Receiver reports it, the status stays AWAITING_DEPOSIT until the
 *   Provider confirms. The card must not ask again in that window.
 * - After that (IN_PROGRESS, AWAITING_ACCEPTANCE, COMPLETED) the deposit is
 *   done. Asking again would be wrong, so the card only says the quotation
 *   was accepted, like the Provider's card. The Deposit card shows the
 *   payment state.
 *
 * Run: node --import tsx --test lib/quotationCopy.test.ts (in apps/mangodb).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { receiverAcceptedQuotationMessage } from './quotationCopy';

const PAY_DEPOSIT =
    "You've accepted the quotation! You're all set to move forward. Please pay the deposit and report the payment once it's done.";
const ACCEPTED_ONLY = "You've accepted the quotation.";

describe('receiverAcceptedQuotationMessage', () => {
    it('asks to pay the deposit while the project is Awaiting Deposit', () => {
        assert.equal(
            receiverAcceptedQuotationMessage('AWAITING_DEPOSIT', null),
            PAY_DEPOSIT,
        );
    });

    it('only says the quotation was accepted once the deposit is reported', () => {
        assert.equal(
            receiverAcceptedQuotationMessage(
                'AWAITING_DEPOSIT',
                '2026-11-14T00:00:00.000Z',
            ),
            ACCEPTED_ONLY,
        );
    });

    for (const status of [
        'IN_PROGRESS',
        'AWAITING_ACCEPTANCE',
        'COMPLETED',
    ] as const) {
        it(`only says the quotation was accepted when ${status}`, () => {
            assert.equal(
                receiverAcceptedQuotationMessage(status, null),
                ACCEPTED_ONLY,
            );
        });
    }
});
