import type { ServiceSummary } from '@/lib/searchServices';

function formatBudget(n: number | null): string {
    if (n == null) return '-';
    return n.toLocaleString('en-US');
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
    return letters.join('') || '?';
}

export function SearchServiceCard({ service }: { service: ServiceSummary }) {
    const visibleTech = service.company.techStack.slice(0, 2);
    const extraTechCount =
        service.company.techStack.length - visibleTech.length;

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
                            <p className="type-xs mt-1 text-[var(--color-ink-soft)]">
                                {service.categories.join(', ')}
                            </p>
                        )}

                        <p className="type-xs mt-1 text-[var(--color-brand)]">
                            ฿{formatBudget(service.minBudget)} - ฿
                            {formatBudget(service.maxBudget)}
                        </p>

                        {visibleTech.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {visibleTech.map((tech) => (
                                    <span
                                        key={tech}
                                        className="rounded-status bg-[var(--color-brand-tint)] px-2 py-0.5 type-xs text-[var(--color-brand-deep)]"
                                    >
                                        {tech}
                                    </span>
                                ))}
                                {extraTechCount > 0 && (
                                    <span className="rounded-status bg-[var(--color-line)] px-2 py-0.5 type-xs text-[var(--color-ink-soft)]">
                                        +{extraTechCount}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Duration/rating aren't in the data model yet
                            (duration lives on JobRequirement, rating on
                            Project) — shown as "-" per the US3-1 acceptance
                            criteria until a service-level source exists. */}
                        <p className="type-xs mt-2 text-[var(--color-ink-placeholder)]">
                            Duration: - &nbsp;·&nbsp; ★ -
                        </p>
                    </div>
                </div>

                <a
                    href={`/matching/${service.listingId}`}
                    className="rounded-button shrink-0 self-end border border-[var(--color-brand)] px-4 py-2 type-xs whitespace-nowrap text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand-tint)]"
                >
                    view detail →
                </a>
            </div>
        </div>
    );
}
