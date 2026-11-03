import DepositRolePreview from './DepositRolePreview';

// The Deposit section for a Provider and a Receiver side by side, each with
// its own state switch (see DepositRolePreview).
export default function DepositPreview() {
    return (
        <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-8">
            <div className="mx-auto max-w-4xl">
                <p className="type-xs text-ink-soft">
                    Temporary preview for T4.6.3. Sample data, no API call.
                </p>
                <h1 className="mt-2 type-lg">Deposit section</h1>

                <div className="mt-6 grid gap-8 md:grid-cols-2">
                    <DepositRolePreview role="provider" />
                    <DepositRolePreview role="receiver" />
                </div>
            </div>
        </main>
    );
}
