import type { CompanyAccountSummary } from '@mangodb/shared';
import { Star } from 'lucide-react';

interface CompanyCardProps {
    company: CompanyAccountSummary;
    onSelect: (companyId: number) => void;
}

export default function CompanyCard({ company, onSelect }: CompanyCardProps) {
    const isProvider =
        company.account_type === 'PROVIDER' || company.account_type === 'BOTH';
    const isReceiver =
        company.account_type === 'RECEIVER' || company.account_type === 'BOTH';
    const roundedRating = Math.round(company.average_rating ?? 0);

    return (
        <button
            type="button"
            onClick={() => onSelect(company.company_id)}
            aria-label={`View details for ${company.company_name}`}
            className="flex h-[28.70vh] min-h-[28.70vh] w-full flex-col justify-between rounded-input border border-[#E5E5E5] bg-white p-[0.83vw] text-left shadow-sm transition hover:-translate-y-[0.19vh] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#497B93] focus-visible:outline-none"
        >
            <div className="min-w-0">
                <div className="mb-[1.11vh] flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                    {isProvider && (
                        <span className="rounded-status bg-[#D36B60] px-[0.63vw] py-[0.19vh] text-xs !font-[600] text-white">
                            Provider
                        </span>
                    )}
                    {isReceiver && (
                        <span className="rounded-status bg-[#66A6C5] px-[0.63vw] py-[0.19vh] text-xs !font-[600] text-white">
                            Receiver
                        </span>
                    )}
                </div>

                <h2 className="mb-[0.56vh] truncate text-md !font-[700] text-[#171717]">
                    {company.company_name}
                </h2>

                <div
                    className="mb-[1.48vh] flex items-center gap-[0.16vw]"
                    aria-label={
                        company.average_rating === null
                            ? 'No ratings yet'
                            : `${company.average_rating} out of 5 stars from ${company.rating_count} ratings`
                    }
                >
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            aria-hidden="true"
                            className={`h-[1.39vh] w-[0.78vw] ${
                                star <= roundedRating
                                    ? 'fill-[#FABC3F] text-[#FABC3F]'
                                    : 'fill-[#D6D6D6] text-[#D6D6D6]'
                            }`}
                        />
                    ))}
                </div>

                <p className="line-clamp-4 text-sm leading-relaxed text-[#4B4B4B]">
                    {company.company_description || 'No company description'}
                </p>
            </div>

            <p className="truncate text-xs text-[#666666]">
                Tel. {company.phone}
            </p>
        </button>
    );
}
