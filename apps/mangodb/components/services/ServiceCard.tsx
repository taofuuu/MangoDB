import type { ServiceSummary } from '@mangodb/shared';
import { Star, Tag, Wallet } from 'lucide-react';
import { initials } from '@/components/companies/CompanyAvatar';
import { formatBudgetRange } from '@/lib/money';

type ServiceCardProps = {
    service: ServiceSummary;
    onViewDetail: (service: ServiceSummary) => void;
};

// One service in the search results. A company's own services page uses
// CompanyServiceCard instead: the design draws the two differently.
export default function ServiceCard({
    service,
    onViewDetail,
}: ServiceCardProps) {
    const roundedRating = Math.round(service.averageRating ?? 0);

    return (
        <div className="rounded-button border border-brand-light bg-surface-white p-5 shadow-card">
            <div className="flex items-stretch justify-between gap-4">
                <div className="flex items-start gap-3">
                    {/* Initials only, never the photo, as the search design draws it. */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent type-md !font-[600] text-surface-white">
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

                <div className="flex shrink-0 flex-col items-end justify-between">
                    <div
                        role="group"
                        aria-label={
                            service.averageRating === null
                                ? 'No reviews yet'
                                : `${service.averageRating.toFixed(1)} out of 5 stars from ${service.ratingCount} reviews`
                        }
                    >
                        {service.averageRating === null ? (
                            <span className="type-xs text-ink-soft">
                                No reviews
                            </span>
                        ) : (
                            <>
                                <span
                                    className="flex gap-0.5"
                                    aria-hidden="true"
                                >
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`size-4 ${
                                                star <= roundedRating
                                                    ? 'fill-accent text-accent'
                                                    : 'fill-line text-line'
                                            }`}
                                        />
                                    ))}
                                </span>
                                <span className="mt-1 block text-right type-xs text-ink">
                                    {service.averageRating.toFixed(1)}
                                    <span className="text-ink-soft">/5</span>
                                </span>
                                <span className="mt-1 block text-right type-xs text-ink-soft">
                                    {service.ratingCount}{' '}
                                    {service.ratingCount === 1
                                        ? 'review'
                                        : 'reviews'}
                                </span>
                            </>
                        )}
                    </div>
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
