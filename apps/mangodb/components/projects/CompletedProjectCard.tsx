import type { CompletedProject } from '@mangodb/shared';
import { BriefcaseBusiness, Clock3 } from 'lucide-react';
import { formatDate } from '@/lib/dates';

type CompletedProjectCardProps = {
    project: CompletedProject;
    isSelected: boolean;
    onViewDetail: (project: CompletedProject) => void;
};

export default function CompletedProjectCard({
    project,
    isSelected,
    onViewDetail,
}: CompletedProjectCardProps) {
    return (
        <article
            className={`flex min-h-[13.7vh] items-center justify-between gap-4 rounded-button border bg-surface-white p-[1.25vw] shadow-card transition ${
                isSelected
                    ? 'border-brand ring-2 ring-brand/20'
                    : 'border-brand-light'
            }`}
        >
            <div className="flex min-w-0 items-center gap-4">
                <BriefcaseBusiness
                    aria-hidden
                    className="size-11 shrink-0 text-brand"
                />
                <div className="min-w-0">
                    <h2 className="truncate type-md !font-[600] text-ink">
                        {project.listingTitle}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 type-xs text-brand">
                        <Clock3 size={14} aria-hidden />
                        Completed {formatDate(project.completedAt)}
                    </p>
                    {project.techStack.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {project.techStack.map((technology) => (
                                <span
                                    key={technology}
                                    className="rounded-status bg-fill-subtle px-3 py-1 type-xs text-ink"
                                >
                                    {technology}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onViewDetail(project)}
                className="shrink-0 rounded-button border border-brand px-4 py-2 type-xs text-brand transition hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                view detail →
            </button>
        </article>
    );
}
