import type { ProjectStatus } from '@mangodb/shared';

// The Receiver's Quotation card text once the quotation is accepted. Only
// AWAITING_DEPOSIT with no report yet still needs the Receiver to pay;
// reporting does not change the status (only the Provider's confirm does).
// After that the Deposit card shows the payment state, so this card only
// says it was accepted.
export function receiverAcceptedQuotationMessage(
    projectStatus: ProjectStatus,
    depositReportedAt: string | null,
): string {
    return projectStatus === 'AWAITING_DEPOSIT' && !depositReportedAt
        ? "You've accepted the quotation! You're all set to move forward. Please pay the deposit and report the payment once it's done."
        : "You've accepted the quotation.";
}
