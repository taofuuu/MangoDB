'use client';

import type { ProjectSummary } from '@mangodb/shared';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import { formatDate, formatDateOnly } from '@/lib/dates';
import { formatBaht } from '@/lib/money';
import ProjectStatusBadge, {
    PROJECT_STATUS_CONFIGS,
} from './ProjectStatusBadge';

type ProjectCardProps = {
    project: ProjectSummary;
    onClick?: () => void;
};

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
    const statusConfig = PROJECT_STATUS_CONFIGS[project.projectStatus];
    const borderClass = statusConfig?.cardBorderClass ?? 'border-line';

    return (
        <div
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={`
                group relative flex w-full flex-col gap-4 rounded-status border bg-surface-white p-5
                transition-all duration-150 sm:grid sm:grid-cols-[minmax(0,2fr)_120px_120px_110px_160px] sm:items-center sm:gap-6
                ${borderClass}
                ${onClick ? 'cursor-pointer hover:shadow-card' : 'shadow-card'}
            `}
        >
            {/* Column 1: Avatar + Title & Subtitle */}
            <div className="flex min-w-0 items-center gap-4">
                <div className="shrink-0 rounded-full p-0.5 ring-2 ring-brand">
                    <CompanyAvatar
                        name={project.otherParty.companyName}
                        photoUrl={project.otherParty.companyPhoto}
                        size={40}
                        className="!bg-brand-tint"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="truncate type-md !font-[700] text-ink">
                        {project.listingTitle || 'Untitled Project'}
                    </h3>
                    <p className="truncate type-xs text-ink-soft mt-0.5">
                        {project.otherParty.companyName}
                    </p>
                </div>
            </div>

            {/* Column 2: Start Date */}
            <div className="flex flex-col text-left">
                <span className="type-xs text-ink-soft">Start Date</span>
                <span className="type-sm !font-[500] text-brand whitespace-nowrap">
                    {project.startDate
                        ? formatDateOnly(project.startDate)
                        : '—'}
                </span>
            </div>

            {/* Column 3: End Date */}
            <div className="flex flex-col text-left">
                <span className="type-xs text-ink-soft">End Date</span>
                <span className="type-sm !font-[500] text-brand whitespace-nowrap">
                    {project.completedAt
                        ? formatDate(project.completedAt)
                        : '—'}
                </span>
            </div>

            {/* Column 4: Budget */}
            <div className="flex flex-col text-left">
                <span className="type-xs text-ink-soft">Budget</span>
                <span className="type-sm !font-[500] text-brand whitespace-nowrap">
                    {formatBaht(project.totalBudget)}
                </span>
            </div>

            {/* Column 5: Status Tag */}
            <div className="flex items-center justify-center">
                <ProjectStatusBadge status={project.projectStatus} />
            </div>
        </div>
    );
}
