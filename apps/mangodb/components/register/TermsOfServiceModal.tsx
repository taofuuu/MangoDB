'use client';

import { useId } from 'react';
import { createPortal } from 'react-dom';
import ModalShell from '@/components/ui/ModalShell';
import { TERMS_INTRO, TERMS_OF_SERVICE } from '@/lib/terms';

type TermsOfServiceModalProps = {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
};

// US1-13. Shown when the company presses Create Account without having
// accepted yet. Accept is the consent the API requires; Decline (or Escape, or
// a click on the backdrop) leaves it unaccepted, so registration stays blocked.
export default function TermsOfServiceModal({
    isOpen,
    onAccept,
    onDecline,
}: TermsOfServiceModalProps) {
    const titleId = useId();
    const bodyId = useId();

    if (!isOpen) return null;

    // Portalled to <body>: the register card it is opened from is transformed
    // and clips its overflow, which would trap a fixed overlay inside the card
    // instead of covering the page.
    return createPortal(
        <ModalShell
            isOpen
            onClose={onDecline}
            labelledBy={titleId}
            describedBy={bodyId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-fill-muted/60 p-[2.6vh]"
            panelClassName="flex h-[92vh] w-[44.6vw] min-w-[320px] flex-col rounded-popup bg-surface px-[2.35vw] py-[3.4vh] text-ink shadow-[6px_6px_10px_rgba(0,0,0,0.25)] max-md:w-[90vw] max-md:px-[6vw]"
        >
            <h2
                id={titleId}
                className="shrink-0 text-[48px] font-bold max-sm:text-[32px]"
            >
                Terms of Service
            </h2>

            <div className="h-px shrink-0 bg-ink-soft" />

            {/* tabIndex: the text is the point of the dialog, so a keyboard
                user has to be able to focus it to scroll through. */}
            <div
                id={bodyId}
                tabIndex={0}
                className="mt-[3.4vh] min-h-0 flex-1 overflow-y-auto pl-[1.5vw] pr-[1vw] text-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand max-sm:text-[16px]"
            >
                <p className="leading-[1.65]">{TERMS_INTRO}</p>
                {TERMS_OF_SERVICE.map((section) => (
                    <section key={section.heading}>
                        <h3 className="mt-[0.5em] text-[24px] font-medium max-sm:text-[20px]">
                            {section.heading}
                        </h3>
                        <p className="leading-[1.65]">{section.body}</p>
                    </section>
                ))}
            </div>

            <div className="mt-[2vh] flex shrink-0 justify-end gap-[20px] max-sm:gap-3">
                <button
                    type="button"
                    onClick={onDecline}
                    className="h-[46px] w-[153px] rounded-status border border-brand bg-surface text-[20px] font-bold text-brand shadow-[2px_4px_4px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand-tint max-sm:w-full"
                >
                    Decline
                </button>
                <button
                    type="button"
                    onClick={onAccept}
                    className="h-[46px] w-[151px] rounded-status bg-brand text-[20px] font-bold text-surface shadow-[2px_4px_4px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand-dark max-sm:w-full"
                >
                    Accept
                </button>
            </div>
        </ModalShell>,
        document.body,
    );
}
