import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CompletedProject, Review } from '@mangodb/shared';
import { ArrowLeft, Star } from 'lucide-react';
import CompanyAvatar from '@/components/companies/CompanyAvatar';
import { ApiRequestError, describeError, isNotSignedIn } from '@/lib/api';
import { formatDate, formatDateOnly } from '@/lib/dates';
import { getProjectReview } from '@/lib/projects';
import { redirectToUnauthorized } from '@/lib/session';

type DetailTab = 'details' | 'review';
type ReviewLoadState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; review: Review | null }
    | { status: 'error'; message: string };

const REVIEW_SCORES: Array<{
    key: keyof Pick<
        Review,
        | 'serviceScore'
        | 'deliveryTimeScore'
        | 'workQualityScore'
        | 'valueForMoneyScore'
    >;
    label: string;
}> = [
    { key: 'serviceScore', label: 'Service' },
    { key: 'deliveryTimeScore', label: 'Delivery time' },
    { key: 'workQualityScore', label: 'Work quality' },
    { key: 'valueForMoneyScore', label: 'Value for money' },
];

export default function CompletedProjectDetailPanel({
    project,
    onClose,
}: {
    project: CompletedProject;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<DetailTab>('details');
    const [reviewState, setReviewState] = useState<ReviewLoadState>({
        status: 'idle',
    });

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    useEffect(() => {
        if (activeTab !== 'review') return;

        let active = true;

        void getProjectReview(project.projectId)
            .then((nextReview) => {
                if (active) {
                    setReviewState({ status: 'ready', review: nextReview });
                }
            })
            .catch((cause: unknown) => {
                if (!active) return;
                // A public completed-work page can be viewed by a company
                // outside the project. It still has the overall score/comment
                // from US2-5; only the four private score fields are absent.
                if (cause instanceof ApiRequestError && cause.status === 404) {
                    setReviewState({ status: 'ready', review: null });
                    return;
                }
                if (isNotSignedIn(cause)) {
                    redirectToUnauthorized();
                    return;
                }
                setReviewState({
                    status: 'error',
                    message: describeError(cause),
                });
            });

        return () => {
            active = false;
        };
    }, [activeTab, project.projectId]);

    const showReview = () => {
        if (activeTab === 'review') return;
        setReviewState({ status: 'loading' });
        setActiveTab('review');
    };

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
            <div className="mb-[1.5vh] flex gap-2">
                <button
                    type="button"
                    aria-pressed={activeTab === 'details'}
                    onClick={() => setActiveTab('details')}
                    className={`rounded-full px-3 py-1 type-xs transition-colors ${
                        activeTab === 'details'
                            ? 'bg-fill-muted text-ink'
                            : 'text-ink-soft hover:bg-fill-subtle'
                    }`}
                >
                    Service detail
                </button>
                <button
                    type="button"
                    aria-pressed={activeTab === 'review'}
                    onClick={showReview}
                    className={`rounded-full px-3 py-1 type-xs transition-colors ${
                        activeTab === 'review'
                            ? 'bg-fill-muted text-ink'
                            : 'text-ink-soft hover:bg-fill-subtle'
                    }`}
                >
                    Review
                </button>
            </div>
            {activeTab === 'review' ? (
                <CompletedProjectReview project={project} state={reviewState} />
            ) : (
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
                    <Detail
                        label={
                            project.listingType === 'SERVICE'
                                ? 'Service Name'
                                : 'Job Title'
                        }
                    >
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
            )}
        </aside>
    );
}

function ScoreStars({ score }: { score: number }) {
    return (
        <span className="flex gap-0.5" aria-label={`${score} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    aria-hidden="true"
                    className={`size-4 ${
                        star <= score
                            ? 'fill-accent text-accent'
                            : 'fill-line text-line'
                    }`}
                />
            ))}
        </span>
    );
}

function CompletedProjectReview({
    project,
    state,
}: {
    project: CompletedProject;
    state: ReviewLoadState;
}) {
    if (state.status === 'idle' || state.status === 'loading') {
        return <p className="type-sm text-ink-soft">Loading review…</p>;
    }
    if (state.status === 'error') {
        return (
            <p role="alert" className="type-sm text-danger">
                {state.message}
            </p>
        );
    }

    const { review } = state;
    const average = review
        ? (review.workQualityScore +
              review.serviceScore +
              review.valueForMoneyScore +
              review.deliveryTimeScore) /
          4
        : project.rating;
    const comment = review?.comment ?? project.reviewComment;

    if (average === null && !comment) {
        return <p className="type-sm text-ink-soft">No review yet.</p>;
    }

    return (
        <div className="flex flex-1 flex-col gap-[2vh] overflow-y-auto pr-[0.5vw]">
            <div className="grid grid-cols-2 divide-x divide-line">
                <div className="pr-4">
                    <h3 className="type-sm text-ink">Average rating</h3>
                    {average !== null && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="type-md !font-[600] text-ink">
                                {average.toFixed(1)}
                                <span className="type-xs text-ink-soft">
                                    /5
                                </span>
                            </span>
                            <ScoreStars score={Math.round(average)} />
                        </div>
                    )}
                </div>
                <div className="pl-4">
                    <h3 className="type-sm text-ink">Reviewer</h3>
                    <div className="mt-2 flex items-center gap-2">
                        <CompanyAvatar
                            name={project.receiver.companyName}
                            photoUrl={project.receiver.companyPhoto}
                            size={28}
                        />
                        <span className="truncate type-xs text-ink">
                            {project.receiver.companyName}
                        </span>
                    </div>
                </div>
            </div>

            {review && (
                <div className="grid grid-cols-2 gap-2 border-y border-line py-3">
                    {REVIEW_SCORES.map(({ key, label }) => (
                        <div
                            key={key}
                            className="flex items-center justify-between gap-2"
                        >
                            <span className="type-xs text-ink-soft">
                                {label}
                            </span>
                            <ScoreStars score={review[key]} />
                        </div>
                    ))}
                </div>
            )}

            <section>
                <h3 className="type-sm !font-[600] text-ink">Comment</h3>
                <p className="mt-2 whitespace-pre-wrap type-sm leading-relaxed text-ink">
                    {comment || 'No comment provided.'}
                </p>
                {review && (
                    <p className="mt-4 type-xs text-ink-soft">
                        {formatDate(review.createdAt)}
                    </p>
                )}
            </section>
        </div>
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
