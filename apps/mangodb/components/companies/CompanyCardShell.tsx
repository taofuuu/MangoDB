'use client';

import type { ReactNode } from 'react';

type CompanyCardShellProps = {
    companyName: string;
    onSelect: () => void;
    children: ReactNode;
};

export const companyCardClassName =
    'flex h-[28.70vh] min-h-[28.70vh] w-full flex-col justify-between rounded-input border border-line bg-white p-[0.83vw] text-left shadow-sm transition hover:-translate-y-[0.19vh] hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none';

// The single square-card shell used by both the administrator list and US3-6.
// Keeping the dimensions and interaction here makes the two cards identical by
// construction instead of relying on two copied class strings staying aligned.
export default function CompanyCardShell({
    companyName,
    onSelect,
    children,
}: CompanyCardShellProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-label={`View details for ${companyName}`}
            className={companyCardClassName}
        >
            {children}
        </button>
    );
}
