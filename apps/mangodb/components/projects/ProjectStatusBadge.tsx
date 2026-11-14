import type { ProjectStatus } from '@mangodb/shared';

export type ProjectStatusBadgeConfig = {
    label: string;
    badgeClass: string;
    cardBorderClass: string;
};

export const PROJECT_STATUS_CONFIGS: Record<
    ProjectStatus,
    ProjectStatusBadgeConfig
> = {
    COMPLETED: {
        label: 'Completed',
        badgeClass: 'bg-brand text-surface-white border border-transparent',
        cardBorderClass: 'border-brand',
    },
    AWAITING_ACCEPTANCE: {
        label: 'Awaiting Acceptance',
        badgeClass: 'bg-accent text-surface-white border border-transparent',
        cardBorderClass: 'border-accent',
    },
    IN_PROGRESS: {
        label: 'In-Progress',
        badgeClass: 'bg-transparent border border-brand text-brand',
        cardBorderClass: 'border-brand',
    },
    AWAITING_DEPOSIT: {
        label: 'Awaiting Deposit',
        badgeClass:
            'bg-transparent border border-role-provider text-role-provider',
        cardBorderClass: 'border-role-provider',
    },
    AWAITING_QUOTATION: {
        label: 'Awaiting Quotation',
        badgeClass: 'bg-danger text-surface-white border border-transparent',
        cardBorderClass: 'border-danger',
    },
    CANCELLED: {
        label: 'Cancelled',
        badgeClass:
            'bg-fill-muted text-surface-white border border-transparent',
        cardBorderClass: 'border-line',
    },
};

export default function ProjectStatusBadge({
    status,
    className = '',
}: {
    status: ProjectStatus;
    className?: string;
}) {
    const config = PROJECT_STATUS_CONFIGS[status] ?? {
        label: status,
        badgeClass: 'bg-fill-muted text-ink-soft border border-transparent',
        cardBorderClass: 'border-line',
    };

    return (
        <span
            className={`inline-flex items-center justify-center px-3 py-1.5 rounded-status type-xs !font-[600] text-center w-[160px] whitespace-nowrap shadow-xs ${config.badgeClass} ${className}`}
        >
            {config.label}
        </span>
    );
}
