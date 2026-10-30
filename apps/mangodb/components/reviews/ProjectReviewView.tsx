'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectDetail, Review } from '@mangodb/shared';
import { ArrowLeft, BriefcaseBusiness, Wallet } from 'lucide-react';
import ReviewSection from '@/components/reviews/ReviewSection';
import { describeError } from '@/lib/api';
import { formatBaht } from '@/lib/money';
import { getProject, getProjectReview } from '@/lib/projects';
import ReviewPageError from './ReviewPageError';

type ProjectReviewViewProps = {
    projectId: number;
};

export default function ProjectReviewView({
    projectId,
}: ProjectReviewViewProps) {
    const router = useRouter();
    const projectPath = `/projects/${projectId}`;
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [review, setReview] = useState<Review | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        Promise.all([
            getProject(projectId),
            getProjectReview(projectId).catch(() => null),
        ])
            .then(([nextProject, nextReview]) => {
                if (!isMounted) return;
                setProject(nextProject);
                setReview(nextReview);
            })
            .catch((cause: unknown) => {
                if (isMounted) setError(describeError(cause));
            });

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    if (error) {
        return <ReviewPageError title="Project not found" message={error} />;
    }

    if (!project) {
        return (
            <main className="min-h-screen bg-surface px-4 py-24 text-center type-sm text-ink-soft">
                Loading project for review...
            </main>
        );
    }

    const reviewable =
        project.myRole === 'receiver' && project.projectStatus === 'COMPLETED';

    if (!reviewable && !review) {
        return (
            <ReviewPageError
                title="This project cannot be reviewed yet"
                message="Only the receiver can review a completed project."
                projectId={projectId}
            />
        );
    }

    return (
        <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-8">
            <div className="mx-auto w-full max-w-3xl">
                <Link
                    href={projectPath}
                    className="inline-flex items-center gap-2 type-sm font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to project
                </Link>

                <header className="mt-6 border-b border-brand/50 pb-3">
                    <h1 className="type-hd text-ink">Service Review</h1>
                    <p className="mt-1 type-sm text-ink-soft">
                        Share your experience working with this provider.
                    </p>
                </header>

                <section
                    aria-label="Project being reviewed"
                    className="mt-6 flex gap-4 rounded-button border border-brand-light bg-surface-white p-5 shadow-card"
                >
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-brand-light text-surface-white">
                        <BriefcaseBusiness
                            aria-hidden="true"
                            className="size-8"
                        />
                    </div>
                    <div className="min-w-0">
                        <h2 className="type-md text-ink">
                            {project.listingTitle || 'Untitled project'}
                        </h2>
                        <p className="mt-1 type-sm text-ink-soft">
                            {project.provider.companyName}
                        </p>
                        <p className="mt-2 flex items-center gap-1 type-xs text-brand">
                            <Wallet aria-hidden="true" className="size-3.5" />
                            {formatBaht(project.totalBudget)}
                        </p>
                    </div>
                </section>

                <div className="mt-7 px-1">
                    <ReviewSection
                        projectId={projectId}
                        initialReview={review}
                        onCancel={() => router.push(projectPath)}
                        onSubmitted={() => router.replace(projectPath)}
                    />
                </div>
            </div>
        </main>
    );
}
