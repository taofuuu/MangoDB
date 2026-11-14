'use client';

import { useId } from 'react';
import { CircleCheck } from 'lucide-react';
import ModalShell from '@/components/ui/ModalShell';
import { endSentence } from '@/lib/sentences';

type ProjectCompletedModalProps = {
    isOpen: boolean;
    onReview: () => void;
    onReviewLater: () => void;
    providerName: string;
};

// US4-13's completion acknowledgement keeps the next, optional US5 review
// action close to the acceptance moment without making it mandatory.
export default function ProjectCompletedModal({
    isOpen,
    onReview,
    onReviewLater,
    providerName,
}: ProjectCompletedModalProps) {
    const titleId = useId();
    const descriptionId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onReviewLater}
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName="w-full max-w-[27vw] min-w-[280px] rounded-[20px] bg-surface px-[1.8vw] py-[2.6vh] shadow-xl max-md:max-w-[75vw] max-md:px-[4vw] max-sm:max-w-[90vw]"
        >
            <div className="flex flex-col items-center text-center">
                <CircleCheck
                    aria-hidden="true"
                    className="size-14 text-brand stroke-[2]"
                />
                <h2 id={titleId} className="mt-4 type-lg !font-[700] text-ink">
                    Project completed
                </h2>
                <p
                    id={descriptionId}
                    className="mt-3 type-xs leading-relaxed text-ink"
                >
                    You accepted the work from {endSentence(providerName)} How
                    did it go?
                    <br />
                    Your review helps other companies choose a Provider.
                </p>
                <div className="mt-4 flex w-full justify-end gap-3 border-t border-line pt-3">
                    <button
                        type="button"
                        onClick={onReviewLater}
                        className="h-9 rounded-button bg-fill-muted px-5 type-xs !font-[600] text-ink-soft transition-colors hover:bg-line"
                    >
                        Review later
                    </button>
                    <button
                        type="button"
                        onClick={onReview}
                        className="h-9 rounded-button bg-brand px-5 type-xs !font-[600] text-surface-white transition-colors hover:bg-brand-dark"
                    >
                        Review this project
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
