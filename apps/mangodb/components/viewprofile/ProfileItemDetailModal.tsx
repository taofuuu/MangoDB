'use client';

import Image from 'next/image';
import { useId } from 'react';
import type { Certificate, ServicePortfolio } from '@mangodb/shared';
import { X } from 'lucide-react';
import { hasPortfolioImage } from '@/components/portfolio/portfolioImage';
import ModalShell from '@/components/ui/ModalShell';
import { formatDateOnly, monthLabel } from '@/lib/dates';
import { isStorageImage } from '@/lib/images';

export type ProfileItem =
    | { kind: 'portfolio'; item: ServicePortfolio }
    | { kind: 'certificate'; item: Certificate };

function formatMonth(month: number | null, year: number | null): string {
    if (!month || !year) return '—';
    return `${monthLabel(String(month))} ${year}`;
}

// A link column is free text. Only http(s) becomes an anchor, so a stored
// "javascript:" value is shown as text instead of being clickable.
function isHttpUrl(value: string | null): value is string {
    if (!value) return false;
    try {
        const { protocol } = new URL(value);
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}

interface Row {
    label: string;
    value: string;
    href?: string | undefined;
}

function toView(entry: ProfileItem): {
    eyebrow: string;
    title: string;
    image: string | null;
    description: string | null;
    rows: Row[];
} {
    if (entry.kind === 'portfolio') {
        const p = entry.item;
        return {
            eyebrow: 'Portfolio',
            title: p.portfolioName,
            image: hasPortfolioImage(p.portfolioImage)
                ? p.portfolioImage
                : null,
            description: p.portfolioDescription,
            rows: [
                {
                    label: 'Development date',
                    value: formatDateOnly(p.developmentDate),
                },
                {
                    label: 'Link',
                    value: p.portfolioLink || '—',
                    href: isHttpUrl(p.portfolioLink)
                        ? p.portfolioLink
                        : undefined,
                },
            ],
        };
    }

    const c = entry.item;
    return {
        eyebrow: 'Certificate',
        title: c.certTitle,
        image: isStorageImage(c.certImage) ? c.certImage : null,
        description: null,
        rows: [
            { label: 'Organization', value: c.organization || '—' },
            { label: 'Issued', value: formatMonth(c.issueMonth, c.issueYear) },
            {
                label: 'Expires',
                value: formatMonth(c.expireMonth, c.expireYear),
            },
            { label: 'Credential ID', value: c.credentialId || '—' },
            {
                label: 'Credential URL',
                value: c.credentialUrl || '—',
                href: isHttpUrl(c.credentialUrl) ? c.credentialUrl : undefined,
            },
        ],
    };
}

// Read-only details for one portfolio item or certificate on a company
// profile. It edits nothing, so it works the same on your own profile and on
// another company's.
export default function ProfileItemDetailModal({
    entry,
    onClose,
}: {
    entry: ProfileItem;
    onClose: () => void;
}) {
    const titleId = useId();
    const view = toView(entry);

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-[2.08vw]"
            panelClassName="flex max-h-[92vh] w-full max-w-[40rem] flex-col gap-4 overflow-y-auto rounded-popup bg-surface-white p-6 shadow-xl"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="type-sm text-brand">{view.eyebrow}</span>
                    <h2 id={titleId} className="type-lg !font-[700] text-ink">
                        {view.title}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={`Close ${view.eyebrow.toLowerCase()} details`}
                    className="rounded-button p-2 text-ink-soft hover:bg-line focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                    <X aria-hidden="true" size={18} />
                </button>
            </div>

            {view.image && (
                <div className="relative h-64 w-full overflow-hidden rounded-button border border-line bg-fill-subtle">
                    <Image
                        src={view.image}
                        alt={view.title}
                        fill
                        sizes="40rem"
                        className="object-contain"
                    />
                </div>
            )}

            {view.description && (
                <p className="type-sm text-ink-soft whitespace-pre-line">
                    {view.description}
                </p>
            )}

            <dl className="divide-y divide-line type-sm">
                {view.rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex justify-between gap-4 py-2"
                    >
                        <dt className="text-ink-placeholder">{row.label}</dt>
                        <dd className="min-w-0 break-all text-right text-ink">
                            {row.href ? (
                                <a
                                    href={row.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand hover:underline"
                                >
                                    {row.value}
                                </a>
                            ) : (
                                row.value
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </ModalShell>
    );
}
