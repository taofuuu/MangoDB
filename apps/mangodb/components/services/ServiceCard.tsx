import type { ServiceSummary } from '@mangodb/shared';
import { Star, Tag, Wallet } from 'lucide-react';
import { initials } from '@/components/companies/CompanyAvatar';
import { formatBudgetRange } from '@/lib/money';

type ServiceCardProps = {
    service: ServiceSummary;
    // Months. Passed apart from service because ServiceSummary has no
    // duration yet; null or absent draws no duration line.
    estimatedDuration?: number | null;
    onViewDetail: (service: ServiceSummary) => void;
};

function formatDuration(months: number): string {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
}

// The Provider's average rating as five stars, or "No review" before any.
function ProviderRating({
    averageRating,
    ratingCount,
}: {
    averageRating: number | null;
    ratingCount: number;
}) {
    if (averageRating === null) {
        return <p className="type-xs text-ink-placeholder">No review</p>;
    }

    const roundedRating = Math.round(averageRating);
    return (
        <div className="flex flex-col items-end gap-1">
            <div
                className="flex items-center gap-0.5"
                role="img"
                aria-label={`${averageRating} out of 5 stars`}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        aria-hidden="true"
                        size={20}
                        className={
                            star <= roundedRating
                                ? 'fill-accent text-accent'
                                : 'fill-line text-line'
                        }
                    />
                ))}
            </div>
            <p className="type-xs text-ink-placeholder">
                {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
            </p>
        </div>
    );
}

// One service in the search results. A company's own services page uses
// CompanyServiceCard instead: the design draws the two differently.
export default function ServiceCard({
    service,
    estimatedDuration,
    onViewDetail,
}: ServiceCardProps) {
    return (
        <div className="rounded-button border border-brand-light bg-surface-white p-5 shadow-card">
            <div className="flex items-stretch justify-between gap-4">
                <div className="flex items-start gap-3">
                    {/* Initials only, never the photo, as the search design draws it. */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent type-md font-semibold text-surface-white">
                        {initials(service.company.companyName)}
                    </div>

                    <div>
                        <h3 className="type-md text-ink">
                            {service.listingTitle}
                        </h3>
                        <p className="type-xs text-ink-soft">
                            {service.company.companyName}
                        </p>
                        {service.categories.length > 0 && (
                            <p className="type-xs mt-1 flex items-center gap-1 text-ink-soft">
                                <Tag size={14} className="shrink-0" />
                                {service.categories.join(', ')}
                            </p>
                        )}

                        <p className="type-xs mt-1 flex items-center gap-1 text-brand">
                            <Wallet size={14} className="shrink-0" />
                            {formatBudgetRange(
                                service.minBudget,
                                service.maxBudget,
                            )}
                        </p>
                        {/* pl-[18px] lines the text up with the budget's,
                            past its 14px icon and 4px gap. */}
                        {estimatedDuration != null && (
                            <p className="type-xs pl-[18px] text-brand">
                                {formatDuration(estimatedDuration)}
                            </p>
                        )}

                        {service.techStack.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {service.techStack.map((tech) => (
                                    <span
                                        key={tech}
                                        className="rounded-status bg-brand-tint px-2 py-0.5 type-xs text-brand-deep"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-4">
                    <ProviderRating
                        averageRating={service.averageRating}
                        ratingCount={service.ratingCount}
                    />
                    <button
                        type="button"
                        onClick={() => onViewDetail(service)}
                        className="rounded-button border border-brand px-4 py-2 type-xs whitespace-nowrap text-brand hover:bg-brand-tint focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        view detail →
                    </button>
                </div>
            </div>
        </div>
    );
}
