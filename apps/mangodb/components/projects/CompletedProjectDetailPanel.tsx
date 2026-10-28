import Link from 'next/link';
import type { CompletedProject } from '@mangodb/shared';
import { ArrowLeft } from 'lucide-react';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import { formatDate, formatDateOnly } from '@/lib/dates';

export default function CompletedProjectDetailPanel({
    project,
    onClose,
}: {
    project: CompletedProject;
    onClose: () => void;
}) {
    return (
        <aside className="flex h-[72.63vh] w-[34vw] flex-col rounded-popup bg-surface-white px-[1.5vw] py-[2.5vh] shadow-[0_0_8px_color-mix(in_srgb,var(--color-brand)_25%,transparent)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="type-sm text-brand">Completed Work</p>
                    <h2 className="mt-[0.8vh] type-lg !font-[700] text-ink">
                        {project.listingTitle}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close completed work detail"
                    className="rounded-full p-2 transition hover:bg-fill-subtle"
                >
                    <ArrowLeft size={22} />
                </button>
            </div>
            <hr className="my-[2vh] border-0 border-t border-brand/30" />
            <div className="flex flex-1 flex-col gap-[2vh] overflow-y-auto pr-[0.5vw]">
                <Detail label="Receiver">
                    <div className="flex items-center gap-3 pl-[0.5vw]">
                        <CompanyAvatar
                            name={project.receiver.companyName}
                            photoUrl={project.receiver.companyPhoto}
                            size={44}
                        />
                        <Link
                            href={`/companies/${project.receiver.companyId}`}
                            className="type-md text-ink hover:underline [overflow-wrap:anywhere]"
                        >
                            {project.receiver.companyName}
                        </Link>
                    </div>
                </Detail>
                <Detail label="Service Name">
                    <p className="type-sm text-ink pl-[0.5vw]">
                        {project.listingTitle}
                    </p>
                </Detail>
                <Detail label="Category">
                    <p className="type-sm text-ink pl-[0.5vw]">
                        {project.categories.length > 0
                            ? project.categories.join(', ')
                            : '-'}
                    </p>
                </Detail>
                <Detail label="Description">
                    <p className="type-sm leading-relaxed whitespace-pre-wrap text-ink pl-[0.5vw]">
                        {project.listingDesc || '-'}
                    </p>
                </Detail>
                <Detail label="Completed date">
                    <p className="type-sm text-ink pl-[0.5vw]">
                        {formatDate(project.completedAt)}
                    </p>
                </Detail>
                <Detail label="Project start date">
                    <p className="type-sm text-ink pl-[0.5vw]">
                        {formatDateOnly(project.startDate)}
                    </p>
                </Detail>
                <Detail label="Tech Stack">
                    <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                        {project.techStack.length > 0 ? (
                            project.techStack.map((technology) => (
                                <span
                                    key={technology}
                                    className="rounded-status bg-accent px-[0.63vw] py-[0.19vh] type-sm !font-[600] text-ink"
                                >
                                    {technology}
                                </span>
                            ))
                        ) : (
                            <span className="type-sm text-ink-soft">-</span>
                        )}
                    </div>
                </Detail>
            </div>
        </aside>
    );
}

function Detail({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-[0.6vh]">
            <h3 className="type-sm text-brand">{label}</h3>
            {children}
        </section>
    );
}
