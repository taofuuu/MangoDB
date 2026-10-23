'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ServiceSummary } from '@mangodb/shared';

type ServiceActionsMenuProps = {
    service: ServiceSummary;
    onEdit: (service: ServiceSummary) => void;
    onDelete: (service: ServiceSummary) => void;
};

// The ⋯ menu on one of your own services. Closes on Escape and on a click
// outside it.
export default function ServiceActionsMenu({
    service,
    onEdit,
    onDelete,
}: ServiceActionsMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    // The menu sits inside scrolling lists (the profile's Services box, My
    // Services), which clip anything past their edge. Below is the default;
    // when the popup would be cut off there and has more room above, it opens
    // upward. Runs before paint, so it never shows in the wrong place.
    useLayoutEffect(() => {
        const trigger = menuRef.current;
        const popup = popupRef.current;
        if (!menuOpen || !trigger || !popup) return;

        let clipTop = 0;
        let clipBottom = window.innerHeight;
        for (
            let el = trigger.parentElement;
            el && el !== document.body;
            el = el.parentElement
        ) {
            if (getComputedStyle(el).overflowY !== 'visible') {
                const rect = el.getBoundingClientRect();
                clipTop = Math.max(clipTop, rect.top);
                clipBottom = Math.min(clipBottom, rect.bottom);
            }
        }

        const triggerRect = trigger.getBoundingClientRect();
        const height = popup.offsetHeight;
        const roomBelow = clipBottom - triggerRect.bottom;
        const roomAbove = triggerRect.top - clipTop;
        if (roomBelow < height && roomAbove > roomBelow) {
            popup.classList.replace('top-9', 'bottom-9');
        }
        // A list too short for either side scrolls just enough to show it.
        popup.scrollIntoView({ block: 'nearest' });
    }, [menuOpen]);

    useEffect(() => {
        if (!menuOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        };

        // Escape closes only the menu. It listens in the capture phase and
        // stops there, so the detail panel's own Escape (close) never runs.
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [menuOpen]);

    const actionClass =
        'flex w-full items-center gap-2 rounded-input px-3 py-2 type-sm transition';

    return (
        // A click in here stays here, or the card under it opens its detail too.
        <div
            ref={menuRef}
            className="relative"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                aria-label="Service actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-8 w-8 items-center justify-center rounded-input text-ink-soft transition hover:bg-fill-subtle"
            >
                <MoreHorizontal className="h-5 w-5" />
            </button>

            {menuOpen && (
                <div
                    ref={popupRef}
                    className="absolute right-0 top-9 z-30 min-w-40 rounded-button border border-line bg-surface-white p-1 shadow-lg"
                >
                    <button
                        type="button"
                        className={`${actionClass} text-ink hover:bg-fill-subtle`}
                        onClick={() => {
                            setMenuOpen(false);
                            onEdit(service);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                        Edit service
                    </button>

                    <button
                        type="button"
                        className={`${actionClass} text-danger hover:bg-danger-wash`}
                        onClick={() => {
                            setMenuOpen(false);
                            onDelete(service);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete service
                    </button>
                </div>
            )}
        </div>
    );
}
