'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react';
import type { ServiceListing, ServiceSummary } from '@mangodb/shared';

interface ServiceActionsMenuProps {
    service: ServiceListing | ServiceSummary;
    onEdit?: ((service: ServiceListing | ServiceSummary) => void) | undefined;
    onDelete?: ((service: ServiceListing | ServiceSummary) => void) | undefined;
    onToggleStatus?:
        ((service: ServiceListing | ServiceSummary) => void) | undefined;
    isOpen?: boolean | undefined;
}

export default function ServiceActionsMenu({
    service,
    onEdit,
    onDelete,
    onToggleStatus,
    isOpen = true,
}: ServiceActionsMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuOpen]);

    const actionClass =
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-fill-subtle';

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                aria-label="Service actions"
                aria-expanded={menuOpen}
                onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((open) => !open);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-fill-subtle"
            >
                <MoreHorizontal className="h-5 w-5" />
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-9 z-30 min-w-40 rounded-xl border border-line bg-surface-white p-1 shadow-lg">
                    {onEdit && (
                        <button
                            type="button"
                            className={actionClass}
                            onClick={() => {
                                setMenuOpen(false);
                                onEdit(service);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                            Edit service
                        </button>
                    )}

                    {onToggleStatus && (
                        <button
                            type="button"
                            className={actionClass}
                            onClick={() => {
                                setMenuOpen(false);
                                onToggleStatus(service);
                            }}
                        >
                            <Power className="h-4 w-4" />
                            {isOpen ? 'Close service' : 'Open service'}
                        </button>
                    )}

                    {onDelete && (
                        <button
                            type="button"
                            className={`${actionClass} text-red-600 hover:bg-red-50`}
                            onClick={() => {
                                setMenuOpen(false);
                                onDelete(service);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete service
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
