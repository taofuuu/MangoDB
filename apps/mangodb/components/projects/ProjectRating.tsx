import { Star } from 'lucide-react';

export default function ProjectRating({
    rating,
    showNumber = true,
}: {
    rating: number | null;
    showNumber?: boolean;
}) {
    if (rating === null) {
        return <span className="type-xs text-ink-soft">No review yet</span>;
    }

    const roundedRating = Math.round(rating);

    return (
        <div
            className="flex items-center gap-1.5"
            role="img"
            aria-label={`${rating.toFixed(1)} out of 5 stars`}
        >
            {showNumber && (
                <span className="type-xs !font-[600] text-ink">
                    {rating.toFixed(1)}
                </span>
            )}
            <span className="flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`size-5.5 ${
                            star <= roundedRating
                                ? 'fill-accent text-accent'
                                : 'fill-line text-line'
                        }`}
                    />
                ))}
            </span>
        </div>
    );
}
