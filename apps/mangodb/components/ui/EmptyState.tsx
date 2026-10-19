import Link from 'next/link';
import type { ReactNode } from 'react';

type EmptyStateProps = {
    title: string;
    message?: ReactNode;
    // Where to go instead, e.g. "Search for Jobs".
    action?: { href: string; label: string };
    icon?: ReactNode;
};

// The slashed card from the Figma mock.
function EmptyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-20">
            <path d="M3.09 4.44a1 1 0 0 0 0 1.41l2.03 2.03-.12.13V19a2 2 0 0 0 2 2h10c.35 0 .68-.1.97-.26l1.17 1.17a1 1 0 0 0 1.41-1.41L4.5 4.44a1 1 0 0 0-1.41 0ZM19 16.11V5a2 2 0 0 0-2-2h-6.99L7.95 5.06 19 16.11Z" />
        </svg>
    );
}

// What a list shows when it has nothing in it. Inside a small card, a line of
// text is enough; this is for a page's main list.
export default function EmptyState({
    title,
    message,
    action,
    icon = <EmptyIcon />,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-[9.26vh] text-center">
            <div aria-hidden="true" className="mb-4 text-ink-placeholder">
                {icon}
            </div>
            <h2 className="type-md !font-[600] text-ink">{title}</h2>
            {message && (
                <p className="mt-[0.74vh] type-sm text-ink-soft">{message}</p>
            )}
            {action && (
                <Link
                    href={action.href}
                    className="mt-4 rounded-button bg-brand px-6 py-2 type-xs text-surface-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    {action.label}
                </Link>
            )}
        </div>
    );
}
