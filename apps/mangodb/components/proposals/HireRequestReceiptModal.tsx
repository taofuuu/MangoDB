'use client';

import { useId } from 'react';
import { MailCheck } from 'lucide-react';
import type { Proposal } from '@mangodb/shared';
import ModalShell from '@/components/ui/ModalShell';
import { formatMonths } from '@/lib/dates';
import { formatBaht } from '@/lib/money';
import {
    HIRE_REQUEST_BACKDROP_CLASS,
    HIRE_REQUEST_PANEL_CLASS,
} from './hireRequestModalClasses';

type HireRequestReceiptModalProps = {
    isOpen: boolean;
    serviceName: string;
    companyName: string;
    // The hire request as the API saved it.
    request: Proposal;
    onClose: () => void;
};

// What HireRequestModal shows once the request is sent.
export default function HireRequestReceiptModal({
    isOpen,
    serviceName,
    companyName,
    request,
    onClose,
}: HireRequestReceiptModalProps) {
    const titleId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={titleId}
            backdropClassName={HIRE_REQUEST_BACKDROP_CLASS}
            panelClassName={HIRE_REQUEST_PANEL_CLASS}
        >
            <div className="flex items-center gap-2">
                <MailCheck className="size-6 text-ink" aria-hidden="true" />
                <h2 id={titleId} className="type-md">
                    Hire request sent
                </h2>
            </div>

            <p className="my-[2.22vh] type-md !font-[600]">
                Your hire request for {serviceName} has been sent to{' '}
                {companyName}
            </p>

            <div>
                <p className="type-sm text-ink">Request terms</p>
                <p className="mt-1 whitespace-pre-wrap type-sm text-ink">
                    {request.proposalTerms}
                </p>
            </div>

            <dl className="mt-[2.22vh] grid grid-cols-2 gap-[3vw]">
                <div>
                    <dt className="type-sm text-ink">Budget</dt>
                    <dd className="mt-1 type-sm text-ink">
                        {formatBaht(request.proposalBudget)}
                    </dd>
                </div>
                <div>
                    <dt className="type-sm text-ink">Estimated duration</dt>
                    <dd className="mt-1 type-sm text-ink">
                        {formatMonths(request.duration)}
                    </dd>
                </div>
            </dl>

            <hr className="mt-[2.22vh] border-line" />

            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="h-[4vh] min-w-[80px] rounded-status bg-fill-muted px-6 type-sm font-[500] text-ink transition-colors hover:bg-line"
                >
                    Close
                </button>
            </div>
        </ModalShell>
    );
}
