'use client';

type TagProps = {
    label: string;
    // Omitted for a chip that cannot be taken off.
    onRemove?: () => void;
    // 'sm' fits inside a list row, e.g. a "Closed" mark on a profile card.
    size?: 'sm' | 'md';
    className?: string;
};

const SIZES = {
    sm: 'px-2 type-xs',
    md: 'h-[3.33vh] px-[0.94vw] type-md',
};

// One chip for all three uses in the design — company type, Provider, Receiver.
// They differ only in fill, which the caller passes through className.
export default function Tag({
    label,
    onRemove,
    size = 'md',
    className = '',
}: TagProps) {
    return (
        <span
            className={`inline-flex items-center justify-center gap-[0.42vw] rounded-status whitespace-nowrap ${SIZES[size]} ${className}`}
        >
            {label}

            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${label}`}
                    className="cursor-pointer leading-none opacity-70 hover:opacity-100"
                >
                    ✕
                </button>
            )}
        </span>
    );
}
