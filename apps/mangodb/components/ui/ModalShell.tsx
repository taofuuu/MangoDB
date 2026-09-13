'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    type MouseEvent as ReactMouseEvent,
} from 'react';

// The overlay behaviour every modal in this app needs, written once.
//
// There were seven modal shells. One — DeleteConfirmationModal — had the full
// lifecycle; three had no `useEffect` around the overlay at all, so pressing
// Escape did nothing, the page behind kept scrolling, and closing the modal
// dropped focus to the top of the document. None of the seven trapped focus, so
// Tab walked straight out of the dialog and into the page underneath it.
//
// What this handles:
//   - renders nothing when closed, so the dialog's state starts fresh each time
//   - Escape to close
//   - a click on the backdrop to close (mousedown, so a drag that ends outside
//     the panel does not count as a click on it)
//   - scroll lock on <body>, restored to whatever it was before
//   - focus moved into the panel, and returned to the element that opened it
//   - a focus trap, so Tab cycles inside the dialog
//
// What it deliberately does not handle: what the dialog looks like. Pass the
// panel's own classes — the modals in this app are different sizes and shapes
// and that is fine.

export type ModalShellProps = {
    isOpen: boolean;
    onClose: () => void;
    // While true, Escape and the backdrop stop closing. For a submit in flight:
    // closing halfway through leaves the user unsure whether it happened.
    isBusy?: boolean;
    // 'alertdialog' for a destructive confirmation, which is what screen
    // readers use to interrupt rather than just announce.
    role?: 'dialog' | 'alertdialog';
    labelledBy?: string;
    describedBy?: string;
    // Classes for the panel. The backdrop's are fixed.
    panelClassName?: string;
    backdropClassName?: string;
    children: ReactNode;
};

// Everything focusable, minus anything a browser skips anyway.
const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function ModalShell({ isOpen, ...props }: ModalShellProps) {
    // Unmounting on close is what makes a reopened dialog start clean, rather
    // than showing the previous attempt's half-filled form or stale error.
    return isOpen ? <ModalShellDialog {...props} /> : null;
}

function ModalShellDialog({
    onClose,
    isBusy = false,
    role = 'dialog',
    labelledBy,
    describedBy,
    panelClassName = '',
    backdropClassName = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-[2.6vh]',
    children,
}: Omit<ModalShellProps, 'isOpen'>) {
    const panelRef = useRef<HTMLElement>(null);

    const requestClose = useCallback(() => {
        if (!isBusy) onClose();
    }, [isBusy, onClose]);

    // Mount and unmount only. Nothing here may depend on isBusy: re-running
    // this on every state change would fire the cleanup, which hands focus
    // back to whatever opened the dialog — so clicking Confirm would throw
    // focus out of the dialog it is confirming.
    useEffect(() => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            // isConnected: the opener may have been removed while the dialog
            // was up, and focusing a detached node throws the focus away.
            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }
        };
    }, []);

    // Separate, because this one does have to see the current isBusy.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                requestClose();
                return;
            }

            if (event.key !== 'Tab') return;

            // The trap. Without it, Tab past the last control lands on the
            // page behind the overlay, which the user cannot see.
            const panel = panelRef.current;
            if (!panel) return;

            const focusable = Array.from(
                panel.querySelectorAll<HTMLElement>(FOCUSABLE),
            ).filter((el) => el.offsetParent !== null);

            if (focusable.length === 0) {
                event.preventDefault();
                panel.focus();
                return;
            }

            const first = focusable[0]!;
            const last = focusable[focusable.length - 1]!;
            const active = document.activeElement;

            if (event.shiftKey && (active === first || active === panel)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [requestClose]);

    const handleBackdropDown = (event: ReactMouseEvent<HTMLDivElement>) => {
        // mousedown on the backdrop itself, not a drag that started on the
        // panel and happened to end out here.
        if (event.target === event.currentTarget) requestClose();
    };

    return (
        <div
            className={backdropClassName}
            role="presentation"
            onMouseDown={handleBackdropDown}
        >
            <section
                ref={panelRef}
                role={role}
                tabIndex={-1}
                aria-modal="true"
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                aria-busy={isBusy || undefined}
                className={`focus:outline-none ${panelClassName}`}
            >
                {children}
            </section>
        </div>
    );
}
