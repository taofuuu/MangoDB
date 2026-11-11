'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
    ProjectDetail,
    ProjectUpdate,
    PublicCompanyProfile,
    Quotation,
    Review,
} from '@mangodb/shared';
import { ArrowLeft, CircleCheck, Plus, Send } from 'lucide-react';
import PageGate from '@/components/auth/PageGate';
import AcceptQuotationModal from '@/components/projects/AcceptQuotationModal';
import AddUpdateModal from '@/components/projects/AddUpdateModal';
import ConfirmDepositModal from '@/components/projects/ConfirmDepositModal';
import ProjectSidebar from '@/components/projects/ProjectSidebar';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import ProjectTimelineFeed, {
    type TimelineEvent,
} from '@/components/projects/ProjectTimelineFeed';
import RejectQuotationModal from '@/components/projects/RejectQuotationModal';
import RejectWorkModal from '@/components/projects/RejectWorkModal';
import ReportDepositModal from '@/components/projects/ReportDepositModal';
import ProjectCompletedModal from '@/components/projects/ProjectCompletedModal';
import UploadQuotationModal from '@/components/projects/UploadQuotationModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import SuccessModal from '@/components/ui/SuccessModal';
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
    // Kept apart from an empty list, so a failed load is never shown as
    // "no quotation yet".
    const [quotationsError, setQuotationsError] = useState<string | null>(null);
    const [review, setReview] = useState<Review | null>(null);
    const [otherCompany, setOtherCompany] =
        useState<PublicCompanyProfile | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);

    // Modals state
    const [isUploadQuotationOpen, setIsUploadQuotationOpen] = useState(false);
    // The quotation the Receiver is about to accept; null while the
    // confirmation is closed.
    const [acceptingQuotationId, setAcceptingQuotationId] = useState<
        number | null
    >(null);
    // The quotation the Receiver is about to reject; null while the
    // confirmation is closed.
    const [rejectingQuotationId, setRejectingQuotationId] = useState<
        number | null
    >(null);
    const [isReportDepositOpen, setIsReportDepositOpen] = useState(false);
    const [isConfirmDepositOpen, setIsConfirmDepositOpen] = useState(false);
    const [isAddUpdateOpen, setIsAddUpdateOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isCancelSuccessOpen, setIsCancelSuccessOpen] = useState(false);
    const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
    const [isSubmitSuccessOpen, setIsSubmitSuccessOpen] = useState(false);
    const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
    const [isProjectCompletedOpen, setIsProjectCompletedOpen] = useState(false);
    const acceptedWorkRef = useRef(false);

    // Long description expanded state
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    // Load project data
    const loadData = useCallback(() => {
        let isMounted = true;

        Promise.all([
            getProject(projectId),
            listProjectUpdates(projectId).catch(() => [] as ProjectUpdate[]),
            listQuotations(projectId).then(
                (items) => ({ items, error: null }),
                (err: unknown) => ({
                    items: [] as Quotation[],
                    error: describeError(err),
                }),
            ),
            getProjectReview(projectId).catch(() => null),
        ])
            .then(async ([p, u, q, r]) => {
                if (!isMounted) return;
                setProject(p);
                setUpdates(u);
                setQuotations(q.items);
                setQuotationsError(q.error);
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
            .catch(() => {
                // A failed first load leaves project null, which shows
                // "Project Not Found". A failed reload after an action keeps
                // the page that is already showing, and any open pop-up.
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

    // The Quotation card's Try again: reloads only the quotations, since the
    // rest of the page loaded.
    const reloadQuotations = useCallback(async () => {
        try {
            setQuotations(await listQuotations(projectId));
            setQuotationsError(null);
        } catch (err) {
            setQuotationsError(describeError(err));
        }
    }, [projectId]);

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
    // US4-1. Upload, Replace File and Revise & Resubmit all land here. The
    // API refuses a second pending quotation, so Replace File deletes the
    // pending one first. Errors are rethrown as text for UploadQuotationModal
    // to show under the picker.
    const handleUploadQuotation = async (file: File) => {
        setIsBusy(true);
        let removedPending = false;
        try {
            const pending = quotations.find(
                (q) => q.quotationStatus === 'PENDING',
            );
            if (pending) {
                await deleteQuotation(pending.quotationId, projectId);
                removedPending = true;
                // The reload below can fail too, so drop it from the card now.
                setQuotations((qs) =>
                    qs.filter((q) => q.quotationId !== pending.quotationId),
                );
            }
            await uploadQuotation(projectId, file);
        } catch (err: unknown) {
            const message = describeError(err, {
                409: 'This quotation changed while you were sending it. Check the Quotation card and try again.',
            });
            throw new Error(
                removedPending
                    ? `${message} Your previous quotation was removed, so send the new one again.`
                    : message,
            );
        } finally {
            // Also after a failure: a delete that went through, or a decision
            // the Receiver made meanwhile, must show on the card.
            loadData();
            setIsBusy(false);
        }
    };

    // US4-4. Runs from AcceptQuotationModal's confirm button. Errors are
    // rethrown as text for the modal to show above its buttons.
    const handleAcceptQuotation = async (quotationId: number) => {
        setIsBusy(true);
        try {
            await acceptQuotation(quotationId, projectId);
        } catch (err: unknown) {
            throw new Error(
                describeError(err, {
                    404: 'This quotation was removed by the provider. Check the Quotation card for the latest one.',
                    409: 'This quotation can no longer be accepted. Check the Quotation card for its latest status.',
                }),
            );
        } finally {
            // Also after a failure: a 404 or 409 means the card is out of
            // date, so it must show what changed.
            loadData();
            setIsBusy(false);
        }
    };

    // US4-5. Runs from RejectQuotationModal's confirm button, the same way
    // as accept. Once loadData has the REJECTED quotation, the Provider's
    // card offers "Revise & Resubmit Quotation".
    const handleRejectQuotation = async (quotationId: number) => {
        setIsBusy(true);
        try {
            await rejectQuotation(quotationId, projectId);
        } catch (err: unknown) {
            throw new Error(
                describeError(err, {
                    404: 'This quotation was removed by the provider. Check the Quotation card for the latest one.',
                    409: 'This quotation can no longer be rejected. Check the Quotation card for its latest status.',
                }),
            );
        } finally {
            // Also after a failure, as with accept.
            loadData();
            setIsBusy(false);
        }
    };

    const handleAddUpdate = async (updateText: string) => {
        setIsBusy(true);
        try {
            await createProjectUpdate(projectId, updateText);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    // US4-6. Runs from ReportDepositModal's confirm button, the same way as
    // accepting a quotation. The status stays AWAITING_DEPOSIT; once loadData
    // has depositReportedAt, the Deposit card shows the waiting state.
    const handleReportDeposit = async () => {
        setIsBusy(true);
        try {
            await reportDeposit(projectId);
        } catch (err: unknown) {
            throw new Error(
                describeError(err, {
                    409: 'The deposit can no longer be reported. Check the Deposit card for its latest status.',
                }),
            );
        } finally {
            // Also after a failure: a 409 means the card is out of date (the
            // deposit was already reported, or the project moved on).
            loadData();
            setIsBusy(false);
        }
    };

    const handleConfirmDeposit = async () => {
        setIsBusy(true);
        try {
            await confirmDeposit(projectId);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleSubmitWork = async () => {
        setIsBusy(true);
        try {
            await submitWork(projectId);
            loadData();
            setIsSubmitSuccessOpen(true);
        } finally {
            setIsBusy(false);
        }
    };

    const handleAcceptWork = async () => {
        setIsBusy(true);
        try {
            await acceptWork(projectId);
            loadData();
            acceptedWorkRef.current = true;
        } finally {
            setIsBusy(false);
        }
    };

    const handleAcceptConfirmClose = () => {
        setIsAcceptConfirmOpen(false);
        if (!acceptedWorkRef.current) return;

        acceptedWorkRef.current = false;
        setIsProjectCompletedOpen(true);
    };

    const handleRejectWork = async (reason: string) => {
        setIsBusy(true);
        try {
            await rejectWork(projectId, reason);
            loadData();
        } finally {
            setIsBusy(false);
        }
    };

    const handleCancelProject = async () => {
        setIsBusy(true);
        try {
            await cancelProject(projectId);
            loadData();
            setIsCancelSuccessOpen(true);
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

    if (!project) {
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

                {/* 2-Column Layout (Sidebar Left, Main Content Right) */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Left Sidebar */}
                    <ProjectSidebar
                        project={project}
                        otherCompanyProfile={otherCompany}
                        quotations={quotations}
                        quotationsError={quotationsError}
                        onRetryQuotations={reloadQuotations}
                        review={review}
                        onUploadQuotation={() => setIsUploadQuotationOpen(true)}
                        onAcceptQuotation={setAcceptingQuotationId}
                        onRejectQuotation={setRejectingQuotationId}
                        onDeleteQuotation={async (quotationId) => {
                            await deleteQuotation(quotationId, projectId);
                            loadData();
                        }}
                        onReportDeposit={() => setIsReportDepositOpen(true)}
                        onConfirmDeposit={() => setIsConfirmDepositOpen(true)}
                        onSubmitWork={() => setIsSubmitConfirmOpen(true)}
                        onAcceptWork={() => setIsAcceptConfirmOpen(true)}
                        onRejectWork={() => setIsRejectModalOpen(true)}
                        onReviewProject={() =>
                            router.push(`/projects/${projectId}/review`)
                        }
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
            <ReportDepositModal
                isOpen={isReportDepositOpen}
                onClose={() => setIsReportDepositOpen(false)}
                onConfirm={handleReportDeposit}
            />

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

            <AcceptQuotationModal
                isOpen={acceptingQuotationId !== null}
                onClose={() => setAcceptingQuotationId(null)}
                onConfirm={async () => {
                    if (acceptingQuotationId === null) return;
                    await handleAcceptQuotation(acceptingQuotationId);
                }}
                providerName={project.provider.companyName}
            />

            <RejectQuotationModal
                isOpen={rejectingQuotationId !== null}
                onClose={() => setRejectingQuotationId(null)}
                onConfirm={async () => {
                    if (rejectingQuotationId === null) return;
                    await handleRejectQuotation(rejectingQuotationId);
                }}
            />

            <AddUpdateModal
                isOpen={isAddUpdateOpen}
                onClose={() => setIsAddUpdateOpen(false)}
                onSubmit={handleAddUpdate}
                projectName={project?.listingTitle}
                receiverName={project?.receiver?.companyName}
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
                description="This action cannot be undone."
                confirmLabel="Confirm"
                pendingLabel="Cancelling..."
                cancelLabel="Go Back"
                confirmVariant="danger"
            />

            <SuccessModal
                isOpen={isCancelSuccessOpen}
                onClose={() => setIsCancelSuccessOpen(false)}
                title="Project cancelled successfully"
                actionLabel="OK"
            />

            <ConfirmModal
                isOpen={isSubmitConfirmOpen}
                onClose={() => setIsSubmitConfirmOpen(false)}
                onConfirm={handleSubmitWork}
                title="Submit Project?"
                description="Are you sure you want to submit this project? The receiver will review your work and either accept it or request revisions with feedback."
                icon={<Send aria-hidden="true" className="size-5 text-brand" />}
                confirmLabel="Yes, Submit"
                pendingLabel="Submitting..."
                cancelLabel="Cancel"
                confirmVariant="primary"
            />

            <SuccessModal
                isOpen={isSubmitSuccessOpen}
                onClose={() => setIsSubmitSuccessOpen(false)}
                title="Project Submitted Successfully"
                message="Your project has been submitted and is now awaiting the receiver’s approval. You’ll hear back once they’ve accepted it or requested revisions."
                actionLabel="OK"
            />

            <ConfirmModal
                isOpen={isAcceptConfirmOpen}
                onClose={handleAcceptConfirmClose}
                onConfirm={handleAcceptWork}
                icon={
                    <CircleCheck
                        aria-hidden="true"
                        className="size-11 shrink-0 text-brand"
                    />
                }
                title="Accept the delivered work?"
                description="Accept only if the work meets what you agreed with the Provider. Once you accept, the project is marked Completed and can't be sent back for changes."
                confirmLabel="Accept work"
                pendingLabel="Accepting..."
                cancelLabel="Go Back"
                confirmVariant="primary"
            />

            <ProjectCompletedModal
                isOpen={isProjectCompletedOpen}
                providerName={project.provider.companyName}
                onReviewLater={() => setIsProjectCompletedOpen(false)}
                onReview={() => {
                    setIsProjectCompletedOpen(false);
                    router.push(`/projects/${projectId}/review`);
                }}
            />
        </div>
    );
}
