import type { ServiceSummary } from '@mangodb/shared';
import { Tag } from 'lucide-react';
import { formatBudgetRange } from '@/lib/money';

type CompanyServiceCardProps = {
    service: ServiceSummary;
    onViewDetail: (service: ServiceSummary) => void;
    // Ringed while its detail panel is open beside the list.
    isSelected?: boolean;
};

// One service on a company's services page. The page title already names the
// company, so the card shows a briefcase instead of its avatar and name. The
// search results use ServiceCard.
export default function CompanyServiceCard({
    service,
    onViewDetail,
    isSelected = false,
}: CompanyServiceCardProps) {
    // Two tech stack chips, then "+ N" for the rest.
    const visibleTechStack = service.techStack.slice(0, 2);
    const hiddenCount = service.techStack.length - visibleTechStack.length;

    return (
        <div
            onClick={() => onViewDetail(service)}
            className={`group relative flex cursor-pointer items-start justify-between rounded-[20px] border bg-surface-white p-5 text-left transition-all hover:shadow-md ${
                isSelected
                    ? 'border-brand ring-2 ring-brand/20 shadow-md'
                    : 'border-line/70 shadow-sm hover:border-brand/40'
            }`}
        >
            <div className="flex min-w-0 flex-1 items-start gap-4 pr-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center text-brand">
                    <svg
                        className="h-12 w-12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                    </svg>
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate type-md !font-[700]">
                        {service.listingTitle}
                    </h3>

                    {service.categories.length > 0 && (
                        <p className="mt-0.5 type-xs text-ink-soft">
                            {service.categories.join(', ')}
                        </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-1.5 type-xs font-medium text-brand">
                        <Tag className="h-3.5 w-3.5 shrink-0 rotate-90" />
                        <span>
                            {formatBudgetRange(
                                service.minBudget,
                                service.maxBudget,
                            )}
                        </span>
                    </div>

                    {service.techStack.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {visibleTechStack.map((tech) => (
                                <span
                                    key={tech}
                                    className="rounded-full border border-line bg-fill-subtle px-2.5 py-0.5 type-xs text-ink-soft"
                                >
                                    {tech}
                                </span>
                            ))}
                            {hiddenCount > 0 && (
                                <span className="rounded-full border border-line bg-surface px-2 py-0.5 type-xs text-ink-soft">
                                    + {hiddenCount}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 flex-col items-end justify-end self-stretch">
                <button
                    type="button"
                    onClick={(e) => {
                        // The card's own click would fire too and toggle twice.
                        e.stopPropagation();
                        onViewDetail(service);
                    }}
                    className="flex items-center gap-1 rounded-[8px] border border-brand/50 px-3 py-1 type-xs text-brand transition hover:border-brand hover:bg-brand/10"
                >
                    view detail →
                </button>
            </div>
        </div>
    );
}
