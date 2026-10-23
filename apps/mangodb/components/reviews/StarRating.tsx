'use client';

import { Star } from 'lucide-react';

type StarRatingProps = {
    label: string;
    name: string;
    value: number;
    onChange?: ((value: number) => void) | undefined;
    errorId?: string | undefined;
};

const STARS = [1, 2, 3, 4, 5] as const;

// The same stars render as radio inputs while composing a review and as a
// labelled, read-only score after submission.
export default function StarRating({
    label,
    name,
    value,
    onChange,
    errorId,
}: StarRatingProps) {
    if (!onChange) {
        return (
            <div className="flex items-center justify-between gap-4">
                <span className="type-sm text-ink">{label}</span>
                <div
                    className="flex gap-1"
                    aria-label={`${label}: ${value} out of 5 stars`}
                >
                    {STARS.map((star) => (
                        <Star
                            key={star}
                            aria-hidden="true"
                            className={`size-6 ${
                                star <= value
                                    ? 'fill-accent text-accent'
                                    : 'fill-line text-line'
                            }`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <fieldset
            className="flex min-w-0 items-center justify-between gap-4"
            aria-describedby={errorId}
        >
            <legend className="float-left type-sm text-ink">{label}</legend>
            <div className="flex gap-1" role="radiogroup" aria-label={label}>
                {STARS.map((star) => (
                    <label
                        key={star}
                        className="cursor-pointer rounded-sm focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={star}
                            checked={value === star}
                            onChange={() => onChange(star)}
                            className="sr-only"
                            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                        />
                        <Star
                            aria-hidden="true"
                            className={`size-7 transition-colors ${
                                star <= value
                                    ? 'fill-accent text-accent'
                                    : 'fill-line text-line hover:fill-accent/40 hover:text-accent'
                            }`}
                        />
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
