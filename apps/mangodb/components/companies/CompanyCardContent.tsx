import type { AccountType } from '@mangodb/shared';
import { Star } from 'lucide-react';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';

type CompanyCardContentProps = {
    company: {
        companyName: string;
        companyDescription: string | null;
        phone: string;
        accountType: AccountType;
        averageRating: number | null;
        ratingCount: number;
    };
};

// Shared by the administrator and user company grids so their typography,
// spacing, content order, and fallbacks cannot drift.
export default function CompanyCardContent({
    company,
}: CompanyCardContentProps) {
    const isProvider = isProviderAccount(company.accountType);
    const isReceiver = isReceiverAccount(company.accountType);
    const roundedRating = Math.round(company.averageRating ?? 0);

    return (
        <>
            <div className="min-w-0">
                <div className="mb-[1.11vh] flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                    {isProvider && (
                        <span className="rounded-status bg-role-provider px-[0.63vw] py-[0.19vh] type-xs !font-[600] text-white">
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

                <p className="line-clamp-4 type-sm leading-relaxed text-ink-soft">
                    {company.companyDescription || 'No company description'}
                </p>
            </div>

            <p className="truncate type-xs text-ink-soft">
                Tel. {company.phone}
            </p>
        </>
    );
}
