'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CompletedProject, PaginationMeta } from '@mangodb/shared';
import { ArrowLeft } from 'lucide-react';
import {
    describeError,
    isNotSignedIn,
    NOT_SIGNED_IN,
    parseId,
} from '@/lib/api';
import { listCompletedProjects } from '@/lib/companies';
import { COMPLETED_PROJECT_PAGE_SIZE } from '@/lib/pagination';
import { redirectToUnauthorized } from '@/lib/session';
import CompletedProjectCard from '@/components/projects/CompletedProjectCard';
import CompletedProjectDetailPanel from '@/components/projects/CompletedProjectDetailPanel';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';

export default function CompletedProjectsPage() {
    const companyId = parseId(useParams().companyId);
    const [page, setPage] = useState(1);
    const [projects, setProjects] = useState<CompletedProject[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [selectedProject, setSelectedProject] =
        useState<CompletedProject | null>(null);
    const [isLoading, setIsLoading] = useState(companyId !== null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (companyId === null) {
            return;
        }
        let active = true;
        listCompletedProjects(companyId, page, COMPLETED_PROJECT_PAGE_SIZE)
            .then((response) => {
                if (!active) return;
                setProjects(response.items);
                setPagination(response.pagination);
                setError(null);
                setSelectedProject((current) =>
                    current &&
                    response.items.some(
                        (project) => project.projectId === current.projectId,
                    )
                        ? current
                        : null,
                );
            })
            .catch((err: unknown) => {
                if (!active) return;
                if (isNotSignedIn(err)) {
                    setError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                setError(
                    describeError(err, {
                        404: 'This company could not be found.',
                    }),
                );
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => {
            active = false;
        };
    }, [companyId, page]);

    if (error === NOT_SIGNED_IN)
        return <div className="min-h-screen bg-surface" />;

    const detailOpen = selectedProject !== null;
    return (
        <main className="min-h-screen overflow-x-clip bg-surface px-[6.04vw] py-[5.56vh]">
            <div className="flex max-w-[93.75vw] flex-col gap-[2vh]">
                <div
                    className={detailOpen ? 'w-[91vw]' : 'mx-auto w-[56.56vw]'}
                >
                    <div className="flex items-center gap-[1vw]">
                        {companyId !== null && (
                            <Link
                                href={`/companies/${companyId}`}
                                aria-label="Back to the company profile"
                                className="rounded-full p-2 transition hover:bg-fill-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                                <ArrowLeft size={22} />
                            </Link>
                        )}
                        <h1 className="type-lg !font-[700] text-ink">
                            Completed works
                        </h1>
                        {pagination && (
                            <span className="type-sm text-ink-placeholder">
                                ({pagination.totalItems} items)
                            </span>
                        )}
                    </div>
                    <hr className="mt-[1.5vh] border-0 border-t border-brand/50" />
                </div>

                <div
                    className={`flex gap-[1.5vw] ${
                        detailOpen ? '' : 'justify-center'
                    }`}
                >
                    <div className="flex h-[72.63vh] w-[56.56vw] flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto pr-[0.63vw]">
                            {companyId === null ? (
                                <p className="py-20 text-center type-sm text-ink-soft">
                                    This company could not be found.
                                </p>
                            ) : isLoading ? (
                                <div className="flex flex-col gap-4">
                                    {Array.from({
                                        length: COMPLETED_PROJECT_PAGE_SIZE,
                                    }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-[13.7vh] animate-pulse rounded-button bg-line/60"
                                        />
                                    ))}
                                </div>
                            ) : error ? (
                                <p
                                    role="alert"
                                    className="py-20 text-center type-sm text-danger"
                                >
                                    {error}
                                </p>
                            ) : projects.length === 0 ? (
                                <EmptyState title="No completed works yet" />
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {projects.map((project) => (
                                        <CompletedProjectCard
                                            key={project.projectId}
                                            project={project}
                                            isSelected={
                                                selectedProject?.projectId ===
                                                project.projectId
                                            }
                                            onViewDetail={setSelectedProject}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        <Pagination
                            pagination={error ? null : pagination}
                            onPageChange={setPage}
                            ariaLabel="Completed work pages"
                            isLoading={isLoading}
                        />
                    </div>
                    {selectedProject && (
                        <div className="shrink-0 motion-safe:animate-slide-in">
                            <CompletedProjectDetailPanel
                                project={selectedProject}
                                onClose={() => setSelectedProject(null)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
