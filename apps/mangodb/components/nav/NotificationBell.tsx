'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Notification, NotificationType } from '@mangodb/shared';
import { describeError, isNotSignedIn } from '@/lib/api';
import { formatDateTime } from '@/lib/dates';
import {
    listMyNotifications,
    markNotificationsRead,
} from '@/lib/notifications';
import { useDismiss } from '@/lib/useDismiss';
import {
    ASSIGNMENT,
    ASSIGNMENT_TURNED_IN,
    AUTORENEW,
    BLOCK,
    CALENDAR,
    CANCEL_SCHEDULE_SEND,
    DESCRIPTION,
    DISABLED_BY_DEFAULT,
    DONE_ALL,
    FACT_CHECK,
    LIBRARY_ADD_CHECK,
    NOTIFICATIONS,
    RECEIPT,
    SEND,
    SvgIcon,
    type IconShape,
} from './notificationIcons';

// T4.1.5, ADR 0017. The bell in the navbar and the popup list it opens. The
// badge counts unread notices; opening the popup marks them all read. The
// panel stays mounted and is only hidden when closed, like ProfileMenu.

// Each notice's title and Figma icon. isBad turns the icon red, as the
// Figma does for rejections and cancels.
const NOTICE_LOOK: Record<
    NotificationType,
    { title: string; icon: IconShape; isBad?: boolean }
> = {
    PROPOSAL_RECEIVED: { title: 'New Proposal', icon: DESCRIPTION },
    PROPOSAL_ACCEPTED: { title: 'Proposal Accepted', icon: LIBRARY_ADD_CHECK },
    PROPOSAL_REJECTED: {
        title: 'Proposal Rejected',
        icon: DISABLED_BY_DEFAULT,
        isBad: true,
    },
    QUOTATION_SENT: { title: 'New Quotation', icon: ASSIGNMENT },
    QUOTATION_ACCEPTED: {
        title: 'Quotation Accepted',
        icon: ASSIGNMENT_TURNED_IN,
    },
    QUOTATION_REJECTED: {
        title: 'Quotation Rejected',
        icon: AUTORENEW,
        isBad: true,
    },
    DEPOSIT_REPORTED: { title: 'Deposit Payment Report', icon: RECEIPT },
    DEPOSIT_CONFIRMED: { title: 'Deposit Receipt Confirmed', icon: FACT_CHECK },
    PROJECT_CANCELLED: { title: 'Project Cancelled', icon: BLOCK, isBad: true },
    WORK_SUBMITTED: { title: 'Work Submitted', icon: SEND },
    WORK_REJECTED: {
        title: 'Work Rejected',
        icon: CANCEL_SCHEDULE_SEND,
        isBad: true,
    },
    WORK_ACCEPTED: { title: 'Work Accepted', icon: DONE_ALL },
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
                <SvgIcon shape={NOTIFICATIONS} className="size-7 sm:size-8" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 type-xs !font-[600] text-surface-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <div
                id={panelId}
                hidden={!isOpen}
                // Anchored to the sticky header, not the bell, so on a phone it
                // stays on screen instead of hanging off the bell's left side.
                // The Figma's 720px popup at the navbar's own scale (its 108px
                // bar is 64px here), in px like the ProfileMenu beside it.
                className="absolute right-[2.19vw] top-full z-40 mt-3 max-h-[80vh] w-[27rem] max-w-[calc(100vw-2rem)] origin-top-right overflow-y-auto rounded-2xl border border-brand bg-surface-white px-6 py-4 max-sm:px-4 shadow-[0_4px_10px_rgb(0_0_0/0.25)] transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
            >
                <div className="flex items-center gap-2 border-b border-brand-dark pb-3">
                    <SvgIcon
                        shape={NOTIFICATIONS}
                        className="size-8 text-brand"
                    />
                    <h2 className="type-lg text-ink">
                        Notification ({notices.length})
                    </h2>
                </div>

                {loadError && (
                    <p role="alert" className="pt-4 type-sm text-danger">
                        {loadError}
                    </p>
                )}
                {!loadError && notices.length === 0 && (
                    <p className="pt-4 type-sm text-ink-soft">
                        No notifications yet.
                    </p>
                )}

                <ul>
                    {notices.map((notice) => {
                        const { icon, isBad } =
                            NOTICE_LOOK[notice.notificationType];
                        return (
                            <li
                                key={notice.notificationId}
                                className="border-b border-brand-dark/50 last:border-b-0"
                            >
                                <Link
                                    href={hrefOf(notice)}
                                    onClick={() => setIsOpen(false)}
                                    // New since this list loaded: a light
                                    // brand fill, kept while the popup is open.
                                    className={`my-1.5 flex gap-3 rounded-button px-2 py-2.5 transition-colors hover:bg-brand-tint focus-visible:bg-brand-tint focus-visible:outline-none ${
                                        notice.readAt === null
                                            ? 'bg-brand-mist'
                                            : ''
                                    }`}
                                >
                                    <SvgIcon
                                        shape={icon}
                                        className={`size-11 shrink-0 ${
                                            isBad
                                                ? 'text-danger'
                                                : 'text-brand-light'
                                        }`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="type-md text-ink">
                                            {titleOf(notice)}
                                        </p>
                                        <p className="flex gap-2 type-sm">
                                            <span className="text-ink-placeholder">
                                                From
                                            </span>
                                            <span className="truncate text-ink">
                                                {notice.sender.companyName}
                                            </span>
                                        </p>
                                        <p className="flex gap-2 type-sm">
                                            <span className="text-ink-placeholder">
                                                {listingLabel(notice)}
                                            </span>
                                            <span className="truncate text-ink">
                                                {notice.listingTitle}
                                            </span>
                                        </p>
                                        <p className="flex items-center gap-1.5 type-sm text-brand">
                                            <SvgIcon
                                                shape={CALENDAR}
                                                className="h-3.5 w-3 shrink-0"
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
