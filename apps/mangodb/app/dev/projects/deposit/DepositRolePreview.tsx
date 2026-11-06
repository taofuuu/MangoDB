'use client';

import { useState } from 'react';
import type {
    ListingType,
    ProjectDetail,
    ProjectRole,
    ProjectStatus,
} from '@mangodb/shared';
import ConfirmDepositModal from '@/components/projects/ConfirmDepositModal';
import DepositSection from '@/components/projects/DepositSection';
import ReportDepositModal from '@/components/projects/ReportDepositModal';
import Button from '@/components/ui/Button';

// One role's column on /dev/projects/deposit: a state switch, the Deposit
// card, and its pop-ups. Sample data until the Receiver's report is wired
// (T4.6.6). Each action fakes a 600 ms request so the pending labels show,
// then moves the card to its next state.

// The states the switch offers, in order (conventions §6: the union comes
// from the array).
const SAMPLE_STATES = [
    'awaiting-quotation',
    'awaiting-deposit',
    'reported',
    'confirmed',
    'cancelled',
] as const;
type SampleState = (typeof SAMPLE_STATES)[number];

const LABELS: Record<SampleState, string> = {
    'awaiting-quotation': 'Awaiting quotation',
    'awaiting-deposit': 'Awaiting deposit',
    reported: 'Reported',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
};

const REPORTED_AT = '2026-10-27T07:05:00.000Z';
const CONFIRMED_AT = '2026-10-28T03:30:00.000Z';

const STATUS: Record<SampleState, ProjectStatus> = {
    'awaiting-quotation': 'AWAITING_QUOTATION' satisfies ProjectStatus,
    'awaiting-deposit': 'AWAITING_DEPOSIT' satisfies ProjectStatus,
    reported: 'AWAITING_DEPOSIT' satisfies ProjectStatus,
    confirmed: 'IN_PROGRESS' satisfies ProjectStatus,
    cancelled: 'CANCELLED' satisfies ProjectStatus,
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
        listingType: 'SERVICE' satisfies ListingType,
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

export default function DepositRolePreview({ role }: { role: ProjectRole }) {
    const [state, setState] = useState<SampleState>('awaiting-quotation');
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    return (
        <section className="flex flex-col gap-4">
            <h2 className="type-md !font-[600]">
                {role === 'provider' ? 'Provider' : 'Receiver'}
            </h2>

            <div className="flex flex-wrap gap-2">
                {SAMPLE_STATES.map((s) => (
                    <Button
                        key={s}
                        variant={state === s ? 'primary' : 'outline'}
                        onClick={() => setState(s)}
                        aria-pressed={state === s}
                        // primary has no border of its own; giving every chip
                        // one keeps the selected chip the same size.
                        className="border border-brand px-3 py-1 type-xs"
                    >
                        {LABELS[s]}
                    </Button>
                ))}
            </div>

            {/* 27.66vw is the Figma card's 531px of 1920. The px floor is the
                exception docs/ai-brief.md "Sizing" allows ("keep a min-w on
                anything that must stay tappable"), so the card and its
                buttons keep a usable width on a narrow window. */}
            <div className="w-full sm:w-[27.66vw] sm:min-w-[300px]">
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
