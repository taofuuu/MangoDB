'use client';

import { useState } from 'react';
import type {
    ProjectDetail,
    ProjectRole,
    Quotation,
    QuotationStatus,
} from '@mangodb/shared';
import AcceptQuotationModal from '@/components/projects/AcceptQuotationModal';
import QuotationSection from '@/components/projects/QuotationSection';
import RejectQuotationModal from '@/components/projects/RejectQuotationModal';
import UploadQuotationModal from '@/components/projects/UploadQuotationModal';

// Sample data until the Quotation section's API calls land (T4.1.8 upload,
// T4.3.2 load, T4.4.2 accept, T4.5.2 reject). Every action fakes a 600 ms
// request so the pending labels show, then moves the card to its next state.

type SampleState = 'none' | QuotationStatus;

const STATES: { value: SampleState; label: string }[] = [
    { value: 'none', label: 'No quotation yet' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ACCEPTED', label: 'Accepted' },
];

const PROVIDER = {
    companyId: 1,
    companyName: 'Mango Software Studio',
    companyPhoto: null,
};
const RECEIVER = {
    companyId: 2,
    companyName: 'Mango Café Co., Ltd.',
    companyPhoto: null,
};

function sampleProject(role: ProjectRole, state: SampleState): ProjectDetail {
    return {
        projectId: 1,
        proposalId: 1,
        totalBudget: 120000,
        startDate: '2026-10-20',
        // Accepting a quotation moves the project on to Awaiting Deposit.
        projectStatus:
            state === 'ACCEPTED' ? 'AWAITING_DEPOSIT' : 'AWAITING_QUOTATION',
        depositReportedAt: null,
        depositConfirmedAt: null,
        completedAt: null,
        listingId: 1,
        listingType: 'SERVICE',
        listingTitle: 'Inventory dashboard for a café chain',
        provider: PROVIDER,
        receiver: RECEIVER,
        myRole: role,
    };
}

function sampleQuotations(state: SampleState): Quotation[] {
    if (state === 'none') return [];
    return [
        {
            quotationId: 1,
            projectId: 1,
            // No real file behind the sample.
            quotationFile: '#sample-quotation.pdf',
            quotationStatus: state,
            createdAt: '2026-10-27T07:05:00.000Z',
        },
    ];
}

const fakeRequest = () => new Promise((resolve) => setTimeout(resolve, 600));

export default function QuotationPreview() {
    const [failNextSubmit, setFailNextSubmit] = useState(false);

    return (
        <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-8">
            <div className="mx-auto max-w-4xl">
                <p className="type-xs text-ink-soft">
                    Temporary preview for T4.1.4. Sample data, no API call.
                </p>
                <h1 className="mt-2 type-lg">Quotation section</h1>

                <label className="mt-4 flex items-center gap-2 type-sm">
                    <input
                        type="checkbox"
                        checked={failNextSubmit}
                        onChange={(e) => setFailNextSubmit(e.target.checked)}
                    />
                    Make the next quotation submit fail
                </label>

                <div className="mt-6 grid gap-8 md:grid-cols-2">
                    <RolePreview
                        role="provider"
                        failNextSubmit={failNextSubmit}
                        onSubmitFailed={() => setFailNextSubmit(false)}
                    />
                    <RolePreview
                        role="receiver"
                        failNextSubmit={failNextSubmit}
                        onSubmitFailed={() => setFailNextSubmit(false)}
                    />
                </div>
            </div>
        </main>
    );
}

type RolePreviewProps = {
    role: ProjectRole;
    failNextSubmit: boolean;
    onSubmitFailed: () => void;
};

function RolePreview({
    role,
    failNextSubmit,
    onSubmitFailed,
}: RolePreviewProps) {
    const [state, setState] = useState<SampleState>('none');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAcceptOpen, setIsAcceptOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);

    return (
        <section className="flex flex-col gap-4">
            <h2 className="type-md !font-[600]">
                {role === 'provider' ? 'Provider' : 'Receiver'}
            </h2>

            <div className="flex flex-wrap gap-2">
                {STATES.map((s) => (
                    <button
                        key={s.value}
                        type="button"
                        onClick={() => setState(s.value)}
                        aria-pressed={state === s.value}
                        className={`rounded-button border px-3 py-1 type-xs transition-colors ${
                            state === s.value
                                ? 'border-brand bg-brand text-surface'
                                : 'border-line bg-surface-white text-ink hover:bg-fill-subtle'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="w-full sm:w-[320px]">
                <QuotationSection
                    project={sampleProject(role, state)}
                    quotations={sampleQuotations(state)}
                    onUploadQuotation={() => setIsUploadOpen(true)}
                    onAcceptQuotation={() => setIsAcceptOpen(true)}
                    onRejectQuotation={() => setIsRejectOpen(true)}
                />
            </div>

            <UploadQuotationModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onSubmit={async () => {
                    await fakeRequest();
                    if (failNextSubmit) {
                        onSubmitFailed();
                        throw new Error(
                            'Could not upload the quotation. Please try again.',
                        );
                    }
                    setState('PENDING');
                }}
            />
            <AcceptQuotationModal
                isOpen={isAcceptOpen}
                onClose={() => setIsAcceptOpen(false)}
                providerName={PROVIDER.companyName}
                onConfirm={async () => {
                    await fakeRequest();
                    setState('ACCEPTED');
                }}
            />
            <RejectQuotationModal
                isOpen={isRejectOpen}
                onClose={() => setIsRejectOpen(false)}
                onConfirm={async () => {
                    await fakeRequest();
                    setState('REJECTED');
                }}
            />
        </section>
    );
}
