'use client';

import { useEffect, useState } from 'react';
import type { CompanyReview, Paginated } from '@mangodb/shared';
import { CalendarDays, Star } from 'lucide-react';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import Pagination from '@/components/ui/Pagination';
import { describeError, isNotSignedIn } from '@/lib/api';
import { listCompanyReviews } from '@/lib/companies';
import { formatDateOnly } from '@/lib/dates';
import { COMPANY_REVIEW_PAGE_SIZE } from '@/lib/pagination';
import { redirectToUnauthorized } from '@/lib/session';

type CompanyReviewsTabProps = {
    companyId: number;
    ratingCount: number;
};

const SCORES: Array<{
    key: keyof Pick<
        CompanyReview,
        | 'workQualityScore'
        | 'serviceScore'
        | 'valueForMoneyScore'
        | 'deliveryTimeScore'
    >;
    label: string;
}> = [
    { key: 'workQualityScore', label: 'Work quality' },
    { key: 'serviceScore', label: 'Service' },
    { key: 'valueForMoneyScore', label: 'Value for money' },
    { key: 'deliveryTimeScore', label: 'Delivery time' },
];

function averageReviewScore(review: CompanyReview): number {
    return (
        (review.workQualityScore +
            review.serviceScore +
            review.valueForMoneyScore +
            review.deliveryTimeScore) /
        4
    );
}

function ScoreStars({ score }: { score: number }) {
    return (
        <span aria-label={`${score} out of 5 stars`} className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    aria-hidden="true"
                    className={`size-3.5 ${
                        star <= score
                            ? 'fill-accent text-accent'
                            : 'fill-line text-line'
                    }`}
                />
            ))}
        </span>
    );
}

export default function CompanyReviewsTab({
    companyId,
    ratingCount,
}: CompanyReviewsTabProps) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Paginated<CompanyReview> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSignedOut, setIsSignedOut] = useState(false);

    useEffect(() => {
        let active = true;

        void listCompanyReviews(companyId, page, COMPANY_REVIEW_PAGE_SIZE)
            .then((next) => {
                if (active) setData(next);
            })
            .catch((cause: unknown) => {
                if (!active) return;
                if (isNotSignedIn(cause)) {
                    setIsSignedOut(true);
                    redirectToUnauthorized();
                    return;
                }
                setError(describeError(cause));
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [companyId, page]);

    const handlePageChange = (nextPage: number) => {
        setIsLoading(true);
        setError(null);
        setPage(nextPage);
    };

    if (isSignedOut) {
        return null;
    }

    if (isLoading) {
        return <p className="type-sm text-ink-soft">Loading reviews…</p>;
    }

    if (error) {
        return (
            <p role="alert" className="type-sm text-danger">
                {error}
            </p>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <p className="type-sm text-ink-soft">
                No reviews yet for this provider.
            </p>
        );
    }

    return (
        <div>
            <p className="mb-3 type-xs text-ink-soft">
                {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
            </p>
            <div className="flex flex-col gap-3">
                {data.items.map((review) => {
                    const average = averageReviewScore(review);
                    return (
                        <article
                            key={review.reviewId}
                            className="rounded-input border border-line bg-surface-white p-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <CompanyAvatar
                                        name={review.receiver.companyName}
                                        photoUrl={review.receiver.companyPhoto}
                                        size={32}
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate type-sm !font-[600] text-ink">
                                            {review.receiver.companyName}
                                        </p>
                                        <p className="flex items-center gap-1 type-xs text-ink-soft">
                                            <CalendarDays
                                                aria-hidden="true"
                                                className="size-3"
                                            />
                                            {formatDateOnly(review.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="type-sm !font-[600] text-ink">
                                        {average.toFixed(1)}
                                        <span className="type-xs text-ink-soft">
                                            /5
                                        </span>
                                    </p>
                                    <ScoreStars score={Math.round(average)} />
                                </div>
                            </div>

                            {review.comment && (
                                <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 type-sm text-ink">
                                    {review.comment}
                                </p>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
                                {SCORES.map(({ key, label }) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span className="type-xs text-ink-soft">
                                            {label}
                                        </span>
                                        <ScoreStars score={review[key]} />
                                    </div>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </div>
            <Pagination
                pagination={data.pagination}
                onPageChange={handlePageChange}
                ariaLabel="Provider reviews pages"
                isLoading={isLoading}
            />
        </div>
    );
}
