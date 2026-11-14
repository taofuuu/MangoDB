import type {
    ListingType,
    Notification,
    NotificationType,
    ProjectRole,
} from '@mangodb/shared';
import type { Prisma } from '../generated/prisma/client';
import { companyBriefSelect, toCompanyBrief } from './company-profile';

// T4.1.5. What one bell notice shows: who acted, on which listing, and the
// project if the proposal became one.
export const notificationSelect = {
    notificationId: true,
    notificationType: true,
    readAt: true,
    createdAt: true,
    sender: { select: companyBriefSelect },
    proposal: {
        select: {
            listing: {
                select: {
                    listingId: true,
                    listingType: true,
                    listingTitle: true,
                },
            },
            project: { select: { projectId: true } },
        },
    },
} as const satisfies Prisma.NotificationSelect;

type NotificationRow = Prisma.NotificationGetPayload<{
    select: typeof notificationSelect;
}>;

// The casts are safe because only NOTIFICATION_TYPES and LISTING_TYPES values
// are written.
export function toNotification(row: NotificationRow): Notification {
    const { listing, project } = row.proposal;
    return {
        notificationId: row.notificationId,
        notificationType: row.notificationType as NotificationType,
        sender: toCompanyBrief(row.sender),
        listingId: listing.listingId,
        listingType: listing.listingType as ListingType,
        listingTitle: listing.listingTitle,
        projectId: project?.projectId ?? null,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
    };
}

// A project action tells the other party what the caller just did, inside
// the action's transaction: a refused action saves no notice either.
// assertProjectParty and assertQuotationParty both give `party`.
export async function notifyOtherParty(
    tx: Prisma.TransactionClient,
    party: {
        proposalId: number;
        providerId: number;
        receiverId: number;
        myRole: ProjectRole;
    },
    notificationType: NotificationType,
): Promise<void> {
    const callerIsProvider = party.myRole === 'provider';
    await tx.notification.create({
        data: {
            proposalId: party.proposalId,
            senderId: callerIsProvider ? party.providerId : party.receiverId,
            recipientId: callerIsProvider ? party.receiverId : party.providerId,
            notificationType,
        },
    });
}
