import ReviewSection, {
    type ReviewContent,
} from '@/components/reviews/ReviewSection';

const sampleSubmittedReview: ReviewContent = {
    workQualityScore: 4,
    serviceScore: 5,
    valueForMoneyScore: 4,
    deliveryTimeScore: 3,
    comment:
        'The team communicated clearly and delivered thoughtful work. The final delivery took slightly longer than planned.',
};

// Temporary review surface for T5.1.4. T4.9.13 will place ReviewSection on
// the real project page; T5.1.8 will replace the local submit with the API.
export default function ReviewPreviewPage() {
    return (
        <main className="min-h-screen bg-surface px-4 py-10 sm:px-8">
            <div className="mx-auto max-w-5xl space-y-10">
                <div>
                    <h1 className="type-hd text-ink">Review section preview</h1>
                    <p className="mt-2 type-sm text-ink-soft">
                        Interactive form and submitted state for Sprint 3 task
                        T5.1.4.
                    </p>
                </div>

                <ReviewSection />
                <ReviewSection initialReview={sampleSubmittedReview} />
            </div>
        </main>
    );
}
