'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CompletedProject } from '@mangodb/shared';
import { Clock3 } from 'lucide-react';
import { describeError, isNotSignedIn } from '@/lib/api';
import { listCompletedProjects } from '@/lib/companies';
import { formatDate } from '@/lib/dates';
import { PROFILE_COMPLETED_PROJECT_SIZE } from '@/lib/pagination';
import { redirectToUnauthorized } from '@/lib/session';

type PreviewState =
    | { status: 'loading' }
    | { status: 'ready'; items: CompletedProject[]; hasMore: boolean }
    | { status: 'error'; message: string };

// The profile stays compact: it previews two real completed projects and
// leaves the paginated collection to its own page.
export default function CompletedWorksPreview({
    companyId,
}: {
    companyId: number;
}) {
    const [state, setState] = useState<PreviewState>({ status: 'loading' });

    useEffect(() => {
        let active = true;
        listCompletedProjects(companyId, 1, PROFILE_COMPLETED_PROJECT_SIZE)
            .then(({ items, pagination }) => {
                if (!active) return;
                setState({
                    status: 'ready',
                    items,
                    hasMore: pagination.totalItems > items.length,
                });
            })
            .catch((err: unknown) => {
                if (!active) return;
                if (isNotSignedIn(err)) {
                    redirectToUnauthorized();
                    return;
                }
                setState({ status: 'error', message: describeError(err) });
            });

        return () => {
            active = false;
        };
    }, [companyId]);

    return (
        <section className="flex h-[420px] flex-col rounded-popup border border-line bg-surface-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="type-md !font-[700] text-ink">
                    Completed Works
                </h2>
                {state.status === 'ready' && state.hasMore && (
                    <Link
                        href={`/companies/${companyId}/completed-projects`}
                        className="type-xs text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                        See more
                    </Link>
                )}
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {state.status === 'loading' && (
                    <div
                        className="flex flex-col gap-3"
                        aria-label="Loading completed work"
                    >
                        {Array.from({ length: 2 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-20 animate-pulse rounded-button bg-fill-subtle"
                            />
                        ))}
                    </div>
                )}

                {state.status === 'error' && (
                    <p role="alert" className="type-sm text-danger">
                        {state.message}
                    </p>
                )}

                {state.status === 'ready' && state.items.length === 0 && (
                    <p className="py-12 text-center type-sm text-ink-soft">
                        No completed works yet.
                    </p>
                )}

                {state.status === 'ready' && state.items.length > 0 && (
                    <ol className="relative ml-3 space-y-3 border-l-2 border-brand/50 pl-5">
                        {state.items.map((project) => (
                            <li key={project.projectId} className="relative">
                                <span className="absolute -left-[27px] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-brand bg-surface-white" />
                                <article className="rounded-button border border-line bg-surface-white px-4 py-3 shadow-sm">
                                    <p className="truncate type-sm !font-[600] text-ink">
                                        {project.listingTitle}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1 type-xs text-brand">
                                        <Clock3 size={13} aria-hidden />
                                        Completed{' '}
                                        {formatDate(project.completedAt)}
                                    </p>
                                </article>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}
