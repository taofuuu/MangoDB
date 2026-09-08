'use client';

type TagProps = {
    label: string;
    // Omitted for a chip that cannot be taken off.
    onRemove?: () => void;
    className?: string;
};

// One chip for all three uses in the design — company type, Provider, Receiver.
// They differ only in fill, which the caller passes through className.
export default function Tag({ label, onRemove, className = '' }: TagProps) {
    return (
        <span
            className={`inline-flex h-[3.33vh] items-center justify-center gap-[0.42vw] rounded-status px-[0.94vw] text-md whitespace-nowrap ${className}`}
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
