// A status pill: brand blue for done and good, grey for waiting, red for
// stopped. A feature maps its own statuses onto a tone (ProposalStatusBadge
// does it for proposals), so every status in the app reads the same way.
export type StatusTone = 'brand' | 'neutral' | 'danger';

const TONES: Record<StatusTone, string> = {
    brand: 'bg-brand text-surface-white',
    neutral: 'bg-fill-muted text-ink-soft',
    danger: 'bg-danger text-surface-white',
};

type StatusBadgeProps = {
    label: string;
    tone: StatusTone;
    className?: string;
};

export default function StatusBadge({
    label,
    tone,
    className = '',
}: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-status px-4 py-1 type-xs !font-[600] ${TONES[tone]} ${className}`}
        >
            {label}
        </span>
    );
}
