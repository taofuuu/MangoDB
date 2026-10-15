import type { ProposalStatus } from '@mangodb/shared';

// The pill on a proposal card and in its detail panel. Brand blue (the app's
// button blue) for accepted, grey for still waiting, red for rejected.
const STATUS_STYLE: Record<
    ProposalStatus,
    { label: string; className: string }
> = {
    ACCEPTED: {
        label: 'Accepted',
        className: 'bg-brand text-surface-white',
    },
    PENDING: { label: 'Pending', className: 'bg-fill-muted text-ink-soft' },
    REJECTED: { label: 'Rejected', className: 'bg-danger text-surface-white' },
};

type ProposalStatusBadgeProps = {
    status: ProposalStatus;
    className?: string;
};

export default function ProposalStatusBadge({
    status,
    className = '',
}: ProposalStatusBadgeProps) {
    const { label, className: colour } = STATUS_STYLE[status];

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-status px-4 py-1 type-xs !font-[600] ${colour} ${className}`}
        >
            {label}
        </span>
    );
}
