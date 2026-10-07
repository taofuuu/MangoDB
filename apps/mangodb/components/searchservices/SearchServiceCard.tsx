import type { ServiceSummary } from '@/lib/searchServices';
import { Tag, Wallet } from 'lucide-react';

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
    return letters.join('') || '?';
}

function formatBudget(n: number | null): string {
    if (n == null) return '-';
    return n.toLocaleString('en-US');
}

function formatBudgetRange(
    minBudget: number | null,
    maxBudget: number | null,
): string {
    if (minBudget == null && maxBudget == null) {
        return 'No budget provided';
    }

    if (minBudget == null) {
        return `Up to ฿${formatBudget(maxBudget)}`;
    }

    if (maxBudget == null) {
        return `From ฿${formatBudget(minBudget)}`;
    }

    return `฿${formatBudget(minBudget)} - ฿${formatBudget(maxBudget)}`;
}

export function SearchServiceCard({ service }: { service: ServiceSummary }) {
    return (
        <div className="rounded-button border border-[var(--color-brand-light)] bg-[var(--color-surface-white)] p-5 shadow-card">
            <div className="flex items-stretch justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] type-md font-semibold text-[var(--color-surface-white)]">
                        {initials(service.company.companyName)}
                    </div>

                    <div>
                        <h3 className="type-md text-[var(--color-ink)]">
                            {service.listingTitle}
                        </h3>
                        <p className="type-xs text-[var(--color-ink-soft)]">
                            {service.company.companyName}
                        </p>
                        {service.categories.length > 0 && (
                            <p className="type-xs mt-1 flex items-center gap-1 text-[var(--color-ink-soft)]">
                                <Tag size={14} className="shrink-0" />
                                {service.categories.join(', ')}
                            </p>
                        )}

                        <p className="type-xs mt-1 flex items-center gap-1 text-[var(--color-brand)]">
                            <Wallet size={14} className="shrink-0" />
                            {formatBudgetRange(
                                service.minBudget,
                                service.maxBudget,
                            )}
                        </p>

                        {service.techStack.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {service.techStack.map((tech) => (
                                    <span
                                        key={tech}
                                        className="rounded-status bg-[var(--color-brand-tint)] px-2 py-0.5 type-xs text-[var(--color-brand-deep)]"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* The detail page (/services/:listingId) and its public API are not
                implemented yet, so this is disabled instead of linking to a 404.
                Swap it back to <Link href={`/services/${service.listingId}`}> once
                the detail feature lands. */}
                <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="rounded-button shrink-0 self-end cursor-not-allowed border border-[var(--color-brand)] px-4 py-2 type-xs whitespace-nowrap text-[var(--color-brand)] opacity-40"
                >
                    view detail →
                </button>
            </div>
        </div>
    );
}
