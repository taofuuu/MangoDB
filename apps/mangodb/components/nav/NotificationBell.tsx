'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Ban,
    Bell,
    Calendar,
    CheckCheck,
    CircleX,
    ClipboardCheck,
    ClipboardList,
    CopyCheck,
    FileText,
    ListChecks,
    Receipt,
    RefreshCw,
    Send,
    SquareX,
    type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationType } from '@mangodb/shared';
import { describeError, isNotSignedIn } from '@/lib/api';
import { formatDateTime } from '@/lib/dates';
import {
    listMyNotifications,
    markNotificationsRead,
} from '@/lib/notifications';
import { useDismiss } from '@/lib/useDismiss';

// T4.1.5, ADR 0017. The bell in the navbar and the popup list it opens. The
// badge counts unread notices; opening the popup marks them all read. The
// panel stays mounted and is only hidden when closed, like ProfileMenu.

// Each notice's title and icon, the nearest lucide match to the Figma one.
// isBad turns the icon red, as the Figma does for rejections and cancels.
const NOTICE_LOOK: Record<
    NotificationType,
    { title: string; Icon: LucideIcon; isBad?: boolean }
> = {
    PROPOSAL_RECEIVED: { title: 'New Proposal', Icon: FileText },
    PROPOSAL_ACCEPTED: { title: 'Proposal Accepted', Icon: CopyCheck },
    PROPOSAL_REJECTED: {
        title: 'Proposal Rejected',
        Icon: SquareX,
        isBad: true,
    },
    QUOTATION_SENT: { title: 'New Quotation', Icon: ClipboardList },
    QUOTATION_ACCEPTED: { title: 'Quotation Accepted', Icon: ClipboardCheck },
    QUOTATION_REJECTED: {
        title: 'Quotation Rejected',
        Icon: RefreshCw,
        isBad: true,
    },
    DEPOSIT_REPORTED: { title: 'Deposit Payment Report', Icon: Receipt },
    DEPOSIT_CONFIRMED: { title: 'Deposit Receipt Confirmed', Icon: ListChecks },
    PROJECT_CANCELLED: { title: 'Project Cancelled', Icon: Ban, isBad: true },
    WORK_SUBMITTED: { title: 'Work Submitted', Icon: Send },
    WORK_REJECTED: { title: 'Work Rejected', Icon: CircleX, isBad: true },
    WORK_ACCEPTED: { title: 'Work Accepted', Icon: CheckCheck },
};

// A hire request is a proposal on a service (ADR 0016); the Figma calls it
// a New Project Request.
function titleOf(notice: Notification): string {
    if (
        notice.notificationType === 'PROPOSAL_RECEIVED' &&
        notice.listingType === 'SERVICE'
    ) {
        return 'New Project Request';
    }
    return NOTICE_LOOK[notice.notificationType].title;
}

// Where a click takes you: the project once there is one, else the page the
// proposal is decided on, or your own sent proposals for a rejected one.
function hrefOf(notice: Notification): string {
    if (notice.projectId !== null) return `/projects/${notice.projectId}`;
    if (notice.notificationType === 'PROPOSAL_REJECTED') return '/proposals';
    return notice.listingType === 'JOB'
        ? `/jobs/${notice.listingId}/proposals`
        : `/services/${notice.listingId}/proposals`;
}

// The second line names the project, or the listing before a project exists.
function listingLabel(notice: Notification): string {
    if (notice.projectId !== null) return 'Project';
    return notice.listingType === 'JOB' ? 'Job' : 'Service';
}

export default function NotificationBell() {
    const pathname = usePathname();
    const [notices, setNotices] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    useDismiss(rootRef, isOpen, () => setIsOpen(false));

    // Again on every page change, like the Navbar's profile, so a notice
    // sent while you browse shows up. The list is cached, so this is cheap.
    useEffect(() => {
        let cancelled = false;

        listMyNotifications()
            .then((data) => {
                if (cancelled) return;
                setNotices(data);
                setUnreadCount(data.filter((n) => n.readAt === null).length);
                setLoadError(null);
            })
            .catch((err: unknown) => {
                // Signed out is the Navbar's to show, not the bell's.
                if (!cancelled && !isNotSignedIn(err)) {
                    setLoadError(describeError(err));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    function toggle() {
        const opening = !isOpen;
        setIsOpen(opening);
        if (opening && unreadCount > 0) {
            setUnreadCount(0);
            // A failed save only means the badge comes back on the next load.
            markNotificationsRead().catch(() => {});
        }
    }

    return (
        <div ref={rootRef}>
            <button
                type="button"
                onClick={toggle}
                aria-label={
                    unreadCount > 0
                        ? `Notifications, ${unreadCount} unread`
                        : 'Notifications'
                }
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="relative block rounded-full p-0.5 text-brand transition-colors hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand cursor-pointer"
            >
                <Bell
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    fill="currentColor"
                    aria-hidden
                />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 type-xs !font-[600] text-surface-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <div
                id={panelId}
                hidden={!isOpen}
                // Anchored to the sticky header, not the bell, so on a phone it
                // stays on screen instead of hanging off the bell's left side.
                // Width and padding are the Figma's 720px popup on 1920; gaps
                // between text stay in px, like the type-* sizes they sit in.
                className="absolute right-[2.19vw] top-full z-40 mt-3 max-h-[80vh] w-[37.5vw] min-w-[min(22rem,calc(100vw-2rem))] max-w-[480px] origin-top-right overflow-y-auto rounded-popup border border-brand bg-surface-white p-5 shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--color-brand-deep)_45%,transparent)] transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
            >
                <div className="flex items-center gap-2.5 border-b border-brand-light/40 pb-3">
                    <Bell
                        className="size-6 text-brand"
                        fill="currentColor"
                        aria-hidden
                    />
                    <h2 className="type-md !font-[700] text-ink">
                        Notification ({notices.length})
                    </h2>
                </div>

                {loadError && (
                    <p role="alert" className="py-4 type-xs text-danger">
                        {loadError}
                    </p>
                )}
                {!loadError && notices.length === 0 && (
                    <p className="py-6 text-center type-sm text-ink-soft">
                        No notifications yet.
                    </p>
                )}

                <ul>
                    {notices.map((notice) => {
                        const { Icon, isBad } =
                            NOTICE_LOOK[notice.notificationType];
                        return (
                            <li
                                key={notice.notificationId}
                                className="border-b border-line last:border-b-0"
                            >
                                <Link
                                    href={hrefOf(notice)}
                                    onClick={() => setIsOpen(false)}
                                    // New since this list loaded: a light
                                    // brand fill, kept while the popup is open.
                                    className={`my-1.5 flex gap-3 rounded-button px-3 py-2.5 transition-colors hover:bg-brand-tint focus-visible:bg-brand-tint focus-visible:outline-none ${
                                        notice.readAt === null
                                            ? 'bg-brand-mist'
                                            : ''
                                    }`}
                                >
                                    <Icon
                                        className={`size-6 min-h-6 min-w-6 shrink-0 mt-0.5 ${
                                            isBad
                                                ? 'text-danger'
                                                : 'text-brand-light'
                                        }`}
                                        aria-hidden
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="type-sm !font-[600] text-ink">
                                            {titleOf(notice)}
                                        </p>
                                        <p className="flex gap-1.5 type-xs !font-[400]">
                                            <span className="text-ink-placeholder">
                                                From
                                            </span>
                                            <span className="truncate text-ink">
                                                {notice.sender.companyName}
                                            </span>
                                        </p>
                                        <p className="flex gap-1.5 type-xs !font-[400]">
                                            <span className="text-ink-placeholder">
                                                {listingLabel(notice)}
                                            </span>
                                            <span className="truncate text-ink">
                                                {notice.listingTitle}
                                            </span>
                                        </p>
                                        <p className="flex items-center gap-1.5 type-xs !font-[400] text-brand">
                                            <Calendar
                                                className="h-3.5 w-3.5 shrink-0"
                                                aria-hidden
                                            />
                                            {formatDateTime(notice.createdAt)}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
