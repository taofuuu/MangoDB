'use client';

import { useState } from 'react';
import ConfirmDepositModal from '@/components/projects/ConfirmDepositModal';

// Sample data until the Deposit section (T4.6.3) and its API call (T4.7.2)
// land: a project whose Receiver has reported the deposit.
const SAMPLE_PROJECT = {
    title: 'Inventory dashboard for a café chain',
    receiverName: 'Mango Café Co., Ltd.',
    depositReportedAt: '27 Oct 2026, 14:05',
};

export default function ConfirmDepositPreview() {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);

    return (
        <main className="flex min-h-screen items-center justify-center bg-accent-tint p-8">
            <section className="w-full max-w-md rounded-2xl bg-surface p-8 text-ink shadow-xl">
                <p className="type-xs text-ink-soft">
                    Temporary preview for T4.7.6. No API call.
                </p>
                <h1 className="mt-2 type-lg">{SAMPLE_PROJECT.title}</h1>
                <p className="mt-1 type-sm">
                    Receiver: {SAMPLE_PROJECT.receiverName}
                </p>

                <h2 className="mt-6 type-md">Deposit</h2>
                {isConfirmed ? (
                    <p className="mt-2 type-sm text-brand">
                        Deposit payment confirmed.
                    </p>
                ) : (
                    <>
                        <p className="mt-2 type-sm">
                            Receiver reported deposit payment on{' '}
                            {SAMPLE_PROJECT.depositReportedAt}.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="mt-4 rounded-button bg-brand px-4 py-2 type-sm text-surface transition-colors hover:bg-brand-dark"
                        >
                            Confirm deposit received
                        </button>
                    </>
                )}
            </section>

            <ConfirmDepositModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onConfirm={async () => {
                    // Stands in for the request, so the pending label shows.
                    await new Promise((resolve) => setTimeout(resolve, 600));
                    setIsConfirmed(true);
                }}
            />
        </main>
    );
}
