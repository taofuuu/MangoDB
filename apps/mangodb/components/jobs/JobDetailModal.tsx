'use client';

import { useId } from 'react';
import type { Job } from '@mangodb/shared';
import ModalShell from '@/components/ui/ModalShell';
import JobDetailPanel from './JobDetailPanel';

interface JobDetailModalProps {
    job: Job;
    isOpen: boolean;
    onClose: () => void;
}

// The job search page's side panel, floating over My Jobs or a profile
// instead, the way ServicesSection shows ServiceDetailPanel.
export default function JobDetailModal({
    job,
    isOpen,
    onClose,
}: JobDetailModalProps) {
    const titleId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[2.08vw]"
        >
            <JobDetailPanel job={job} onClose={onClose} titleId={titleId} />
        </ModalShell>
    );
}
