'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import type { Project } from '@mangodb/shared';
import ModalShell from '@/components/ui/ModalShell';

export type AcceptProposalModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => Promise<Project | void>;
    companyName: string;
    isService?: boolean;
};

export default function AcceptProposalModal({
    isOpen,
    ...props
}: AcceptProposalModalProps) {
    return isOpen ? <AcceptProposalDialog {...props} /> : null;
}

function AcceptProposalDialog({
    onClose,
    onAccept,
    companyName,
    isService = false,
}: Omit<AcceptProposalModalProps, 'isOpen'>) {
    const titleId = useId();
    const descriptionId = useId();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptedProject, setAcceptedProject] = useState<Project | null>(
        null,
    );
    const pendingRef = useRef(false);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleConfirm = async () => {
        if (pendingRef.current) return;
        pendingRef.current = true;
        setIsPending(true);
        setError(null);

        try {
            const project = await onAccept();
            if (mountedRef.current) {
                if (
                    project &&
                    typeof project === 'object' &&
                    'projectId' in project
                ) {
                    setAcceptedProject(project);
                } else {
                    onClose();
                }
            }
        } catch (cause) {
            if (mountedRef.current) {
                setError(
                    cause instanceof Error && cause.message
                        ? cause.message
                        : 'Something went wrong. Please try again.',
                );
            }
        } finally {
            pendingRef.current = false;
            if (mountedRef.current) {
                setIsPending(false);
            }
        }
    };

    const handleClose = () => {
        if (!isPending) {
            onClose();
        }
    };

    return (
        <ModalShell
            isOpen
            onClose={handleClose}
            isBusy={isPending}
            role="alertdialog"
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="rounded-[20px] max-h-[92vh] w-full max-w-[24vw] min-w-[280px] overflow-y-auto bg-surface text-ink px-[1.8vw] py-[2.6vh] shadow-xl max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]"
        >
            <div className="flex items-center gap-[1.1vw] max-sm:gap-3">
                <CircleCheck
                    aria-hidden="true"
                    className="h-[4.6vh] min-h-[38px] w-[3vw] min-w-[44px] shrink-0 text-brand"
                />
                <div>
                    <h2 id={titleId} className="type-md text-ink !font-[600]">
                        {acceptedProject
                            ? isService
                                ? 'Hire request accepted'
                                : 'Proposal accepted'
                            : isService
                              ? 'Accept this hire request?'
                              : 'Accept this proposal?'}
                    </h2>
                    <p
                        id={descriptionId}
                        className="mt-[1.2vh] type-xs text-ink !font-[400]"
                    >
                        {acceptedProject ? (
                            <>
                                A project with <strong>{companyName}</strong>{' '}
                                has been created. You can now track its progress
                                and coordinate with the{' '}
                                {isService ? 'client' : 'provider'}.
                            </>
                        ) : isService ? (
                            <>
                                Please review the proposal details before
                                accepting. Once you accept, a project with{' '}
                                <strong>{companyName}</strong> will be created.
                            </>
                        ) : (
                            <>
                                Please review the proposal details before
                                accepting. Once you accept, a project with{' '}
                                <strong>{companyName}</strong> will be created
                                and your job posting will close.
                            </>
                        )}
                    </p>
                </div>
            </div>

            {error && (
                <p role="alert" className="mt-4 type-xs text-danger">
                    {error}
                </p>
            )}

            <hr className="my-[2.6vh] border-brand-dark/20" />

            <div className="flex justify-end gap-[0.7vw] max-sm:flex-col-reverse max-sm:gap-2">
                {acceptedProject ? (
                    <>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-[14px] h-[3.8vh] min-h-[34px] min-w-[105px] border-0 px-3 bg-fill-muted type-xs text-ink-soft !font-[600] outline-none transition-colors hover:bg-line focus-visible:outline-none max-sm:w-full"
                        >
                            Close
                        </button>
                        <Link
                            href={`/projects/${acceptedProject.projectId}`}
                            className="rounded-[14px] h-[3.8vh] min-h-[34px] min-w-[105px] px-3 type-xs text-surface !font-[600] transition-colors bg-brand hover:bg-brand-dark flex items-center justify-center gap-1.5 shadow-xs max-sm:w-full"
                        >
                            Open project
                        </Link>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isPending}
                            className="rounded-[14px] h-[3.8vh] min-h-[34px] min-w-[105px] border-0 px-3 bg-fill-muted type-xs text-ink-soft !font-[600] outline-none transition-colors hover:bg-line focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                        >
                            Go Back
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConfirm()}
                            disabled={isPending}
                            className="rounded-[14px] h-[3.8vh] min-h-[34px] min-w-[105px] px-3 type-xs text-surface !font-[600] transition-colors bg-brand hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                        >
                            {isPending
                                ? 'Accepting...'
                                : isService
                                  ? 'Accept hire request'
                                  : 'Accept proposal'}
                        </button>
                    </>
                )}
            </div>
        </ModalShell>
    );
}
