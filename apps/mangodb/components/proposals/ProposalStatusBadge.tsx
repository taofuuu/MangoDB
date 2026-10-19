import type { ProposalStatus } from '@mangodb/shared';
import StatusBadge, { type StatusTone } from '@/components/ui/StatusBadge';

// Accepted is done and good, Pending is waiting, Rejected is stopped.
const STATUS: Record<ProposalStatus, { label: string; tone: StatusTone }> = {
    ACCEPTED: { label: 'Accepted', tone: 'brand' },
    PENDING: { label: 'Pending', tone: 'neutral' },
    REJECTED: { label: 'Rejected', tone: 'danger' },
};

type ProposalStatusBadgeProps = {
    status: ProposalStatus;
    className?: string;
};

// The pill on every proposal card and detail panel, sent or received.
export default function ProposalStatusBadge({
    status,
    className = '',
}: ProposalStatusBadgeProps) {
    return <StatusBadge {...STATUS[status]} className={className} />;
}
