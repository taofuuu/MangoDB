import type { CompanyAccountSummary } from '@mangodb/shared';
import { Star } from 'lucide-react';

interface CompanyCardProps {
    company: CompanyAccountSummary;
    onSelect: (companyId: number) => void;
}

export default function CompanyCard({ company, onSelect }: CompanyCardProps) {
    const isProvider =
        company.accountType === 'PROVIDER' || company.accountType === 'BOTH';
    const isReceiver =
        company.accountType === 'RECEIVER' || company.accountType === 'BOTH';
    const roundedRating = Math.round(company.averageRating ?? 0);

    return (
        <button
            type="button"
            onClick={() => onSelect(company.companyId)}
            aria-label={`View details for ${company.companyName}`}
            className="flex h-[28.70vh] min-h-[28.70vh] w-full flex-col justify-between rounded-input border border-line-soft bg-white p-[0.83vw] text-left shadow-sm transition hover:-translate-y-[0.19vh] hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
            <div className="min-w-0">
                <div className="mb-[1.11vh] flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                    {isProvider && (
                        <span className="rounded-status bg-danger-soft px-[0.63vw] py-[0.19vh] type-xs !font-[600] text-white">
                            Provider
                        </span>
                    )}
                    {isReceiver && (
                        <span className="rounded-status bg-brand-light px-[0.63vw] py-[0.19vh] type-xs !font-[600] text-white">
                            Receiver
                        </span>
                    )}
                </div>

                <h2 className="mb-[0.56vh] truncate type-md !font-[700] text-ink">
                    {company.companyName}
                </h2>

                <div
                    className="mb-[1.48vh] flex items-center gap-[0.16vw]"
                    aria-label={
                        company.averageRating === null
                            ? 'No ratings yet'
                            : `${company.averageRating} out of 5 stars from ${company.ratingCount} ratings`
                    }
                >
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            aria-hidden="true"
                            className={`h-[1.39vh] w-[0.78vw] ${
                                star <= roundedRating
                                    ? 'fill-accent text-accent'
                                    : 'fill-line text-line'
                            }`}
                        />
                    ))}
                </div>

                <p className="line-clamp-4 type-sm leading-relaxed text-ink-muted">
                    {company.companyDescription || 'No company description'}
                </p>
            </div>

            <p className="truncate type-xs text-ink-soft">
                Tel. {company.phone}
            </p>
        </button>
    );
}
