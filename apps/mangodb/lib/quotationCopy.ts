import type { ProjectStatus } from '@mangodb/shared';

// The Receiver's Quotation card text once the quotation is accepted. Only
// AWAITING_DEPOSIT still needs the Receiver to pay; after that the Deposit
// card shows the payment state, so this card only says it was accepted.
export function receiverAcceptedQuotationMessage(
    projectStatus: ProjectStatus,
): string {
    return projectStatus === 'AWAITING_DEPOSIT'
        ? "You've accepted the quotation! You're all set to move forward. Please pay the deposit and report the payment once it's done."
        : "You've accepted the quotation.";
}
