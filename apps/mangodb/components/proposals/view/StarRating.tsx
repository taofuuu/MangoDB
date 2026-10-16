interface StarRatingProps {
    /** 0–5, supports decimals for partial fill */
    rating: number | null;
    /** Total number of stars (default 5) */
    max?: number;
    /** Star size in px (default 14) */
    size?: number;
    /** Show numeric value next to stars */
    showValue?: boolean;
}

/**
 * Renders up to `max` stars. Filled stars are yellow, empty stars are grey.
 * Supports half-star precision via SVG clip paths.
 */
export function StarRating({
    rating,
    max = 5,
    size = 14,
    showValue = true,
}: StarRatingProps) {
    const score = rating ?? 0;
    const clamped = Math.min(Math.max(score, 0), max);

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
                {Array.from({ length: max }, (_, i) => {
                    const fill = Math.min(1, Math.max(0, clamped - i));
                    const pct = Math.round(fill * 100);

                    const id = `star-clip-${i}-${Math.round(clamped * 10)}`;

                    return (
                        <svg
                            key={i}
                            width={size}
                            height={size}
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <defs>
                                <clipPath id={id}>
                                    <rect
                                        x="0"
                                        y="0"
                                        width={pct === 100 ? 20 : pct / 5}
                                        height="20"
                                    />
                                </clipPath>
                            </defs>

                            {/* Grey base star */}
                            <path
                                d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"
                                fill="#D1D5DB"
                            />

                            {/* Yellow fill star, clipped to fill% */}
                            <path
                                d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.44.91-5.32L2.27 6.62l5.34-.78z"
                                fill="#FBBF24"
                                clipPath={`url(#${id})`}
                            />
                        </svg>
                    );
                })}
            </div>

            {showValue && (
                <span className="text-[10px] text-slate-500 leading-none">
                    {rating !== null && rating !== undefined
                        ? score.toFixed(1)
                        : 'N/A'}
                </span>
            )}
        </div>
    );
}
