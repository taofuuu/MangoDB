'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
    ProjectDetail,
    ProjectUpdate,
    PublicCompanyProfile,
    Quotation,
    Review,
} from '@mangodb/shared';
import { ArrowLeft, Plus } from 'lucide-react';
import PageGate from '@/components/auth/PageGate';
import AddUpdateModal from '@/components/projects/AddUpdateModal';
import ConfirmDepositModal from '@/components/projects/ConfirmDepositModal';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import ProjectTimelineFeed, {
    type TimelineEvent,
} from '@/components/projects/ProjectTimelineFeed';
import RejectWorkModal from '@/components/projects/RejectWorkModal';
import UploadQuotationModal from '@/components/projects/UploadQuotationModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import { describeError, parseId } from '@/lib/api';
import { getCompanyProfile } from '@/lib/companies';
import { formatDate, formatDateOnly } from '@/lib/dates';
import { formatBaht } from '@/lib/money';
import {
    acceptQuotation,
    acceptWork,
    cancelProject,
    confirmDeposit,
    createProjectUpdate,
    deleteQuotation,
    getProject,
    getProjectReview,
    listProjectUpdates,
    listQuotations,
    rejectQuotation,
    rejectWork,
    reportDeposit,
    submitWork,
    uploadQuotation,
} from '@/lib/projects';
import { useMyCompany } from '@/lib/useMyCompany';

export default function ProjectDetailPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId: rawId } = use(params);
    const projectId = parseId(rawId);
    const me = useMyCompany();

    if (me.status !== 'ready') {
        return <PageGate state={me} />;
    }

    if (!projectId) {
        return (
            <div className="min-h-screen bg-surface px-4 py-16 text-center">
                <p className="type-md font-semibold text-danger">
                    Invalid project id
                </p>
                <Link
                    href="/projects"
                    className="mt-4 inline-block text-brand underline type-sm"
                >
                    Back to projects
                </Link>
            </div>
        );
    }

    return <ProjectDetailView projectId={projectId} />;
}

function ProjectDetailView({ projectId }: { projectId: number }) {
    const router = useRouter();

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [review, setReview] = useState<Review | null>(null);
    const [otherCompany, setOtherCompany] =
        useState<PublicCompanyProfile | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    // Modals state
    const [isUploadQuotationOpen, setIsUploadQuotationOpen] = useState(false);
    const [isConfirmDepositOpen, setIsConfirmDepositOpen] = useState(false);
    const [isAddUpdateOpen, setIsAddUpdateOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
    const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);

    // Long description expanded state
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    // Load project data
    const loadData = useCallback(() => {
        let isMounted = true;

        Promise.all([
            getProject(projectId),
            listProjectUpdates(projectId).catch(() => [] as ProjectUpdate[]),
            listQuotations(projectId).catch(() => [] as Quotation[]),
            getProjectReview(projectId).catch(() => null),
        ])
            .then(async ([p, u, q, r]) => {
                if (!isMounted) return;
                setProject(p);
                setUpdates(u);
                setQuotations(q);
                setReview(r);

                // Fetch other party profile
                const otherPartyId =
                    p.myRole === 'provider'
                        ? p.receiver.companyId
                        : p.provider.companyId;
                try {
                    const profile = await getCompanyProfile(otherPartyId);
                    if (isMounted) setOtherCompany(profile);
                } catch {
                    // Profile not found or private
                }
            })
            .catch((err: unknown) => {
                if (!isMounted) return;
                setError(describeError(err));
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [projectId]);

    useEffect(() => {
        return loadData();
    }, [loadData]);

    // Build timeline events
    const timelineEvents = useMemo<TimelineEvent[]>(() => {
        if (!project) return [];

        type EventWithSeq = TimelineEvent & { _seq: number };
        const list: EventWithSeq[] = [];
        let seq = 0;
        const pushEvent = (evt: TimelineEvent) => {
            list.push({ ...evt, _seq: seq++ });
        };

        // Check if backend already returns the full unified timeline (PR 220 / Issue #212)
        const hasUnifiedEvents = updates.some(
            (u) =>
                u.updateType !== 'PROGRESS' && u.updateType !== 'WORK_REJECTED',
        );

        if (hasUnifiedEvents) {
            // Full timeline provided directly by GET /projects/:projectId/updates
            for (const u of updates) {
                switch (u.updateType) {
                    case 'PROPOSAL_ACCEPTED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'proposal-accepted',
                            title: 'Proposal Accepted',
                            date: u.createdAt,
                        });
                        break;
                    case 'QUOTATION_SENT':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'quotation-uploaded',
                            title: 'Quotation Uploaded',
                            date: u.createdAt,
                        });
                        break;
                    case 'QUOTATION_DELETED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'quotation-deleted',
                            title: 'Quotation Deleted',
                            date: u.createdAt,
                        });
                        break;
                    case 'QUOTATION_REJECTED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'quotation-rejected',
                            title: 'Quotation Rejected',
                            date: u.createdAt,
                        });
                        break;
                    case 'QUOTATION_ACCEPTED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'quotation-accepted',
                            title: 'Quotation Accepted',
                            date: u.createdAt,
                        });
                        break;
                    case 'DEPOSIT_REPORTED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'deposit-reported',
                            title: 'Receiver reported deposit payment.',
                            date: u.createdAt,
                        });
                        break;
                    case 'DEPOSIT_CONFIRMED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'deposit-confirmed',
                            title: 'Deposit payment confirmed.',
                            date: u.createdAt,
                        });
                        break;
                    case 'PROGRESS': {
                        const rawText = u.updateText ?? '';
                        const lines = rawText
                            .split('\n')
                            .filter((l) => l.trim().length > 0);
                        const firstLine = lines[0] ?? 'Progress Update';
                        const hasMore = lines.length > 1;
                        const title =
                            firstLine.length <= 60
                                ? firstLine
                                : `${firstLine.slice(0, 57)}...`;
                        const description = hasMore
                            ? lines.slice(1).join('\n')
                            : firstLine.length > 60
                              ? rawText
                              : undefined;

                        pushEvent({
                            id: `update-progress-${u.projectUpdateId}`,
                            type: 'progress-update',
                            title: title,
                            description: description ?? (rawText || undefined),
                            date: u.createdAt,
                            expandable: !!description,
                        });
                        break;
                    }
                    case 'WORK_SUBMITTED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'work-submitted',
                            title: 'Work Submitted',
                            date: u.createdAt,
                        });
                        break;
                    case 'WORK_REJECTED':
                        pushEvent({
                            id: `update-rejected-${u.projectUpdateId}`,
                            type: 'work-rejected',
                            title: 'Work Rejected',
                            description: u.updateText ?? undefined,
                            date: u.createdAt,
                            expandable: !!u.updateText,
                        });
                        break;
                    case 'WORK_ACCEPTED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'work-accepted',
                            title: 'Work Accepted',
                            date: u.createdAt,
                        });
                        break;
                    case 'PROJECT_CANCELLED':
                        pushEvent({
                            id: `update-${u.projectUpdateId}`,
                            type: 'project-cancel',
                            title: 'Project Cancel',
                            date: u.createdAt,
                        });
                        break;
                    default:
                        break;
                }
            }
        } else {
            // Fallback for projects without full unified timeline events
            // 1. Proposal Accepted
            pushEvent({
                id: 'proposal-accepted',
                type: 'proposal-accepted',
                title: 'Proposal Accepted',
                date: project.startDate,
            });

            // 2. Quotations
            for (const q of quotations) {
                pushEvent({
                    id: `quotation-upload-${q.quotationId}`,
                    type: 'quotation-uploaded',
                    title: 'Quotation Uploaded',
                    date: q.createdAt,
                });

                if (q.quotationStatus === 'REJECTED') {
                    pushEvent({
                        id: `quotation-rejected-${q.quotationId}`,
                        type: 'quotation-rejected',
                        title: 'Quotation Rejected',
                        date: q.createdAt,
                    });
                } else if (q.quotationStatus === 'ACCEPTED') {
                    pushEvent({
                        id: `quotation-accepted-${q.quotationId}`,
                        type: 'quotation-accepted',
                        title: 'Quotation Accepted',
                        date: q.createdAt,
                    });
                }
            }

            // 3. Deposit
            if (project.depositReportedAt) {
                pushEvent({
                    id: 'deposit-reported',
                    type: 'deposit-reported',
                    title: 'Receiver reported deposit payment.',
                    date: project.depositReportedAt,
                });
            }

            if (project.depositConfirmedAt) {
                pushEvent({
                    id: 'deposit-confirmed',
                    type: 'deposit-confirmed',
                    title: 'Deposit payment confirmed.',
                    date: project.depositConfirmedAt,
                });
            }

            // 4. Updates (Progress & Work Rejected)
            for (const u of updates) {
                if (u.updateType === 'WORK_REJECTED') {
                    pushEvent({
                        id: `work-submitted-before-rejected-${u.projectUpdateId}`,
                        type: 'work-submitted',
                        title: 'Work Submitted',
                        date: u.createdAt,
                    });
                    pushEvent({
                        id: `update-rejected-${u.projectUpdateId}`,
                        type: 'work-rejected',
                        title: 'Work Rejected',
                        description: u.updateText ?? undefined,
                        date: u.createdAt,
                        expandable: !!u.updateText,
                    });
                } else if (u.updateType === 'PROGRESS') {
                    const rawText = u.updateText ?? '';
                    const lines = rawText
                        .split('\n')
                        .filter((l) => l.trim().length > 0);
                    const firstLine = lines[0] ?? 'Progress Update';
                    const hasMore = lines.length > 1;
                    const title =
                        firstLine.length <= 60
                            ? firstLine
                            : `${firstLine.slice(0, 57)}...`;
                    const description = hasMore
                        ? lines.slice(1).join('\n')
                        : firstLine.length > 60
                          ? rawText
                          : undefined;

                    pushEvent({
                        id: `update-progress-${u.projectUpdateId}`,
                        type: 'progress-update',
                        title: title,
                        description: description ?? (rawText || undefined),
                        date: u.createdAt,
                        expandable: !!description,
                    });
                }
            }

            // 5. Work submitted / accepted
            if (project.projectStatus === 'AWAITING_ACCEPTANCE') {
                const lastDate =
                    updates[updates.length - 1]?.createdAt ??
                    project.depositConfirmedAt ??
                    project.startDate;
                pushEvent({
                    id: 'work-submitted',
                    type: 'work-submitted',
                    title: 'Work Submitted',
                    date: lastDate,
                });
            }

            if (project.completedAt) {
                pushEvent({
                    id: 'work-submitted-completed',
                    type: 'work-submitted',
                    title: 'Work Submitted',
                    date: project.completedAt,
                });
                pushEvent({
                    id: 'work-accepted',
                    type: 'work-accepted',
                    title: 'Work Accepted',
                    date: project.completedAt,
                });
            }

            // 6. Project Cancel
            if (project.projectStatus === 'CANCELLED') {
                const lastDate =
                    updates[updates.length - 1]?.createdAt ??
                    project.depositReportedAt ??
                    project.startDate;
                pushEvent({
                    id: 'project-cancel',
                    type: 'project-cancel',
                    title: 'Project Cancel',
                    date: lastDate,
                });
            }
        }

        // Sort descending: newest on top, oldest at bottom
        // When two events occur on the same day/timestamp, the earlier (previous) event is on the bottom.
        list.sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
                return timeB - timeA;
            }
            return b._seq - a._seq;
        });

        return list;
    }, [project, quotations, updates]);

    // Action Handlers
    const handleUploadQuotation = async (file: File) => {
        setIsBusy(true);
        setActionError(null);
        try {
            const pending = quotations.find(
                (q) => q.quotationStatus === 'PENDING',
            );
            if (pending) {
                await deleteQuotation(pending.quotationId, projectId);
            }
            await uploadQuotation(projectId, file);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleAcceptQuotation = async (quotationId: number) => {
        setIsBusy(true);
        setActionError(null);
        try {
            await acceptQuotation(quotationId, projectId);
            loadData();
        } catch (err: unknown) {
            setActionError(describeError(err));
        } finally {
            setIsBusy(false);
        }
    };

    const handleRejectQuotation = async (quotationId: number) => {
        setIsBusy(true);
        setActionError(null);
        try {
            await rejectQuotation(quotationId, projectId);
            loadData();
        } catch (err: unknown) {
            setActionError(describeError(err));
        } finally {
            setIsBusy(false);
        }
    };

    const handleAddUpdate = async (updateText: string) => {
        setIsBusy(true);
        setActionError(null);
        try {
            await createProjectUpdate(projectId, updateText);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleReportDeposit = async () => {
        setIsBusy(true);
        setActionError(null);
        try {
            await reportDeposit(projectId);
            loadData();
        } catch (err: unknown) {
            setActionError(describeError(err));
        } finally {
            setIsBusy(false);
        }
    };

    const handleConfirmDeposit = async () => {
        setIsBusy(true);
        setActionError(null);
        try {
            await confirmDeposit(projectId);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleSubmitWork = async () => {
        setIsBusy(true);
        setActionError(null);
        try {
            await submitWork(projectId);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleAcceptWork = async () => {
        setIsBusy(true);
        setActionError(null);
        try {
            await acceptWork(projectId);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleRejectWork = async (reason: string) => {
        setIsBusy(true);
        setActionError(null);
        try {
            await rejectWork(projectId, reason);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleCancelProject = async () => {
        setIsBusy(true);
        setActionError(null);
        try {
            await cancelProject(projectId);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface px-4 py-24 text-center type-sm text-ink-soft">
                Loading project details...
            </div>
        );
    }

    if (error || !project) {
        return (
            <main className="min-h-screen bg-surface px-4 py-24 text-ink">
                <div className="mx-auto max-w-4xl">
                    <EmptyState
                        title="Project Not Found"
                        message="No project for this company yet"
                        action={{
                            href: '/projects',
                            label: 'Back to Projects',
                        }}
                    />
                </div>
            </main>
        );
    }

    const isProvider = project.myRole === 'provider';

    const defaultDesc =
        'This project was established through MangoDB Cooperation platform under agreed proposal terms and scope of work.';
    const shouldTruncateDesc = defaultDesc.length > 180;
    const displayedDesc =
        shouldTruncateDesc && !isDescExpanded
            ? defaultDesc.slice(0, 180) + '...'
            : defaultDesc;

    return (
        <div className="min-h-screen bg-surface px-4 py-8 font-sans text-ink sm:px-8">
            <div className="mx-auto w-full max-w-6xl">
                {/* Back to projects breadcrumb */}
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={() => router.push('/projects')}
                        className="inline-flex items-center gap-2 type-sm font-semibold text-brand hover:text-brand-dark transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to your projects
                    </button>
                </div>

                {actionError && (
                    <div
                        role="alert"
                        className="mb-6 rounded-[14px] border border-danger/40 bg-danger/10 px-4 py-3 type-xs text-danger flex items-center justify-between"
                    >
                        <span>{actionError}</span>
                        <button
                            type="button"
                            onClick={() => setActionError(null)}
                            className="font-semibold underline ml-2 hover:opacity-80 transition-opacity"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* 2-Column Layout (Sidebar Left, Main Content Right) */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Left Sidebar */}
                    <ProjectSidebar
                        project={project}
                        otherCompanyProfile={otherCompany}
                        quotations={quotations}
                        review={review}
                        onUploadQuotation={() => setIsUploadQuotationOpen(true)}
                        onAcceptQuotation={handleAcceptQuotation}
                        onRejectQuotation={handleRejectQuotation}
                        onReportDeposit={handleReportDeposit}
                        onConfirmDeposit={() => setIsConfirmDepositOpen(true)}
                        onSubmitWork={() => setIsSubmitConfirmOpen(true)}
                        onAcceptWork={() => setIsAcceptConfirmOpen(true)}
                        onRejectWork={() => setIsRejectModalOpen(true)}
                        onCancelProject={() => setIsCancelConfirmOpen(true)}
                        isBusy={isBusy}
                    />

                    {/* Right Main Content */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        {/* Top Card: Project Header & Info */}
                        <div className="rounded-status border border-line bg-surface-white p-6 shadow-card">
                            <div className="flex flex-col gap-3">
                                <div>
                                    <ProjectStatusBadge
                                        status={project.projectStatus}
                                    />
                                </div>

                                <div className="mt-1">
                                    <h1 className="type-hd !font-[700] text-ink leading-tight">
                                        {project.listingTitle ||
                                            'Untitled Project'}
                                    </h1>
                                    <p className="type-xs text-ink-soft mt-0.5">
                                        {project.listingType === 'JOB'
                                            ? 'Job Project'
                                            : 'Service Project'}
                                    </p>
                                </div>

                                {/* 3 Meta Boxes */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
                                    <div className="rounded-status bg-fill-subtle p-3 text-center">
                                        <span className="type-xs text-ink-soft block">
                                            Budget
                                        </span>
                                        <span className="type-sm !font-[600] text-brand block mt-0.5">
                                            {formatBaht(project.totalBudget)}
                                        </span>
                                    </div>
                                    <div className="rounded-status bg-fill-subtle p-3 text-center">
                                        <span className="type-xs text-ink-soft block">
                                            Start Date
                                        </span>
                                        <span className="type-sm !font-[600] text-brand block mt-0.5">
                                            {project.startDate
                                                ? formatDateOnly(
                                                      project.startDate,
                                                  )
                                                : '—'}
                                        </span>
                                    </div>
                                    <div className="rounded-status bg-fill-subtle p-3 text-center">
                                        <span className="type-xs text-ink-soft block">
                                            End Date
                                        </span>
                                        <span className="type-sm !font-[600] text-brand block mt-0.5">
                                            {project.completedAt
                                                ? formatDate(
                                                      project.completedAt,
                                                  )
                                                : '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-2">
                                    <h4 className="type-xs font-semibold text-ink-soft mb-1">
                                        Description
                                    </h4>
                                    <p className="type-sm text-ink leading-relaxed">
                                        {displayedDesc}
                                        {shouldTruncateDesc && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsDescExpanded(
                                                        !isDescExpanded,
                                                    )
                                                }
                                                className="ml-2 text-brand font-semibold hover:underline"
                                            >
                                                {isDescExpanded
                                                    ? 'See less'
                                                    : 'See more'}
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Timeline Feed */}
                        <div className="rounded-status border border-line bg-surface-white p-6 shadow-card">
                            <div className="flex items-center justify-between mb-6 border-b border-line pb-4">
                                <h2 className="type-lg !font-[700] text-ink">
                                    Timeline
                                </h2>

                                {/* Add Update Button: Provider only (Hidden for Receiver per requirement) */}
                                {isProvider &&
                                    project.projectStatus === 'IN_PROGRESS' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsAddUpdateOpen(true)
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-button bg-brand px-4 py-2 type-xs font-semibold text-surface-white hover:bg-brand-dark transition-colors shadow-xs"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Update
                                        </button>
                                    )}
                            </div>

                            <ProjectTimelineFeed events={timelineEvents} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmDepositModal
                isOpen={isConfirmDepositOpen}
                onClose={() => setIsConfirmDepositOpen(false)}
                onConfirm={handleConfirmDeposit}
            />

            <UploadQuotationModal
                isOpen={isUploadQuotationOpen}
                onClose={() => setIsUploadQuotationOpen(false)}
                onSubmit={handleUploadQuotation}
            />

            <AddUpdateModal
                isOpen={isAddUpdateOpen}
                onClose={() => setIsAddUpdateOpen(false)}
                onSubmit={handleAddUpdate}
            />

            <RejectWorkModal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onSubmit={handleRejectWork}
            />

            <ConfirmModal
                isOpen={isCancelConfirmOpen}
                onClose={() => setIsCancelConfirmOpen(false)}
                onConfirm={handleCancelProject}
                title="Cancel Project"
                description="Are you sure you want to cancel this project? This action cannot be undone."
                confirmLabel="Cancel Project"
                cancelLabel="Keep Project"
                confirmVariant="danger"
            />

            <ConfirmModal
                isOpen={isSubmitConfirmOpen}
                onClose={() => setIsSubmitConfirmOpen(false)}
                onConfirm={handleSubmitWork}
                title="Submit Project for Review"
                description="Are you ready to submit the completed work to the client for inspection and acceptance?"
                confirmLabel="Submit Work"
                cancelLabel="Back"
                confirmVariant="primary"
            />

            <ConfirmModal
                isOpen={isAcceptConfirmOpen}
                onClose={() => setIsAcceptConfirmOpen(false)}
                onConfirm={handleAcceptWork}
                title="Accept Completed Work"
                description="By accepting the work, this project will be marked as COMPLETED. Are you satisfied with the deliverables?"
                confirmLabel="Accept Deliverables"
                cancelLabel="Review Again"
                confirmVariant="primary"
            />
        </div>
    );
}
