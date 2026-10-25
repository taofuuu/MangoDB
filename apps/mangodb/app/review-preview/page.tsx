import { ArrowRight, BriefcaseBusiness, Tag, Wallet } from 'lucide-react';
import ReviewSection from '@/components/reviews/ReviewSection';
import Button from '@/components/ui/Button';
import { formatBudgetRange } from '@/lib/money';

// Temporary surface for visual review. T4.9.13 will mount ReviewSection on the
// real project page and pass projectId; preview mode avoids writing sample data.
export default function ReviewPreviewPage() {
    return (
        <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-[1.67vw]">
            <div className="mx-auto max-w-[900px]">
                <header className="border-b border-brand/50 pb-3">
                    <h1 className="type-hd text-ink">Service Review</h1>
                </header>

                <section
                    aria-label="Project being reviewed"
                    className="mt-6 flex flex-col gap-4 rounded-button border border-brand-light bg-surface-white p-5 shadow-card sm:flex-row sm:items-center"
                >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-sm bg-brand-light text-surface-white">
                            <BriefcaseBusiness
                                aria-hidden="true"
                                className="size-8"
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="type-sm truncate text-ink">
                                Website Development
                            </h2>
                            <p className="type-xs text-ink-placeholder">
                                MangoDB Corporation
                            </p>
                            <p className="mt-1 flex items-center gap-1 type-xs text-ink-soft">
                                <Tag aria-hidden="true" className="size-3.5" />
                                Web Development
                            </p>
                            <p className="mt-1 flex items-center gap-1 type-xs text-brand">
                                <Wallet
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                                {formatBudgetRange(20_000, 35_000)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {['Next.js', 'TypeScript', 'PostgreSQL'].map(
                                    (technology) => (
                                        <span
                                            key={technology}
                                            className="rounded-status bg-brand-tint px-2 py-0.5 type-xs text-brand-deep"
                                        >
                                            {technology}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="inline-flex shrink-0 items-center justify-center gap-1 self-end px-4 py-2 type-xs"
                    >
                        View detail
                        <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Button>
                </section>

                <div className="mt-7 px-1">
                    <ReviewSection preview />
                </div>
            </div>
        </main>
    );
}
