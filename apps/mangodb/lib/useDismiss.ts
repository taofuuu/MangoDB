'use client';

import { useEffect, type RefObject } from 'react';

// Closes a navbar popup on a click outside rootRef, or on Escape. Only
// listens while open: a closed popup has nothing to close.
export function useDismiss(
    rootRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    close: () => void,
): void {
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) close();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [rootRef, isOpen, close]);
}
