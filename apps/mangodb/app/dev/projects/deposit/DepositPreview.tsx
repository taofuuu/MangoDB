'use client';

import { useState } from 'react';
import type {
    ProjectDetail,
    ProjectRole,
    ProjectStatus,
} from '@mangodb/shared';
import ConfirmDepositModal from '@/components/projects/ConfirmDepositModal';
import DepositSection from '@/components/projects/DepositSection';
import ReportDepositModal from '@/components/projects/ReportDepositModal';

// Sample data until the Receiver's report is wired (T4.6.6). Each action
// fakes a 600 ms request so the pending labels show, then moves the card to
// its next state.

type SampleState =
    | 'awaiting-quotation'
    | 'awaiting-deposit'
    | 'reported'
    | 'confirmed'
    | 'cancelled';

const STATES: { value: SampleState; label: string }[] = [
    { value: 'awaiting-quotation', label: 'Awaiting quotation' },
    { value: 'awaiting-deposit', label: 'Awaiting deposit' },
    { value: 'reported', label: 'Reported' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled before deposit' },
];

const REPORTED_AT = '2026-10-27T07:05:00.000Z';
const CONFIRMED_AT = '2026-10-28T03:30:00.000Z';

const STATUS: Record<SampleState, ProjectStatus> = {
    'awaiting-quotation': 'AWAITING_QUOTATION',
    'awaiting-deposit': 'AWAITING_DEPOSIT',
    reported: 'AWAITING_DEPOSIT',
    confirmed: 'IN_PROGRESS',
    cancelled: 'CANCELLED',
};

function sampleProject(role: ProjectRole, state: SampleState): ProjectDetail {
    return {
        projectId: 1,
        proposalId: 1,
        totalBudget: 120000,
        startDate: '2026-10-20',
        projectStatus: STATUS[state],
        depositReportedAt:
            state === 'reported' || state === 'confirmed' ? REPORTED_AT : null,
        depositConfirmedAt: state === 'confirmed' ? CONFIRMED_AT : null,
        completedAt: null,
        listingId: 1,
        listingType: 'SERVICE',
        listingTitle: 'Inventory dashboard for a café chain',
        provider: {
            companyId: 1,
            companyName: 'Mango Software Studio',
            companyPhoto: null,
        },
        receiver: {
            companyId: 2,
            companyName: 'Mango Café Co., Ltd.',
            companyPhoto: null,
        },
        myRole: role,
    };
}

const fakeRequest = () => new Promise((resolve) => setTimeout(resolve, 600));

export default function DepositPreview() {
    return (
        <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-8">
            <div className="mx-auto max-w-4xl">
                <p className="type-xs text-ink-soft">
                    Temporary preview for T4.6.3. Sample data, no API call.
                </p>
                <h1 className="mt-2 type-lg">Deposit section</h1>

                <div className="mt-6 grid gap-8 md:grid-cols-2">
                    <RolePreview role="provider" />
                    <RolePreview role="receiver" />
                </div>
            </div>
        </main>
    );
}

function RolePreview({ role }: { role: ProjectRole }) {
    const [state, setState] = useState<SampleState>('awaiting-quotation');
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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
                <DepositSection
                    project={sampleProject(role, state)}
                    onReportDeposit={() => setIsReportOpen(true)}
                    onConfirmDeposit={() => setIsConfirmOpen(true)}
                />
            </div>

            <ReportDepositModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                onConfirm={async () => {
                    await fakeRequest();
                    setState('reported');
                }}
            />
            <ConfirmDepositModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={async () => {
                    await fakeRequest();
                    setState('confirmed');
                }}
            />
        </section>
    );
}
