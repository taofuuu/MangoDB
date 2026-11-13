'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AccountType } from '@mangodb/shared';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { useDismiss } from '@/lib/useDismiss';
import FieldError from '../ui/FieldError';
import RoleTags from '../companies/RoleTags';

// Same rules the API enforces. Checking here too is not security — the
// server's check is — it is so the user finds out before waiting for an
// upload to be rejected. Matches FileUpload.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

type ProfilePhotoPanelProps = {
    // The saved photo, as stored. Null until the company uploads one.
    photoUrl: string | null;
    // The file picked but not saved yet, which previews over photoUrl.
    pendingPhoto: File | null;
    // Absent when the panel is read-only — an administrator editing another
    // company, which has no endpoint behind it.
    onPhotoChange?: ((file: File | null) => void) | undefined;
    // Clears the stored photo. Its own request, made straight away rather than
    // on Save: there is no "delete this later" state for the form to hold.
    onPhotoRemove?: (() => void) | undefined;
    onPhotoError?: ((message: string) => void) | undefined;
    error?: string | undefined;
    isRemoving?: boolean | undefined;
    accountType: AccountType;
};

export default function ProfilePhotoPanel({
    photoUrl,
    pendingPhoto,
    onPhotoChange,
    onPhotoRemove,
    onPhotoError,
    error,
    isRemoving = false,
    accountType,
}: ProfilePhotoPanelProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    useDismiss(dropdownRef, isOpen, () => setIsOpen(false));

    // Derived, not state: the URL is a pure function of the picked file, and
    // setting state from an effect would render once without the preview.
    const preview = useMemo(
        () => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : null),
        [pendingPhoto],
    );

    // One object URL per picked file, released when another replaces it and on
    // unmount. Without the revoke the blob stays in memory for the tab's life.
    useEffect(() => {
        if (!preview) {
            return;
        }
        return () => URL.revokeObjectURL(preview);
    }, [preview]);

    // Handed to the page, which uploads it when the form is saved. Uploading
    // on pick would write a photo the Cancel button then could not take back.
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        // Cleared either way, or picking the same rejected file twice fires no
        // change event and the user sees nothing happen.
        e.target.value = '';

        if (!IMAGE_TYPES.includes(file.type)) {
            onPhotoError?.('Only PNG, JPEG or WebP images are allowed.');
            return;
        }
        if (file.size > MAX_BYTES) {
            onPhotoError?.('Image must be 5MB or smaller.');
            return;
        }

        onPhotoChange?.(file);
    };

    const shown = preview ?? photoUrl;

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <div className="size-50 overflow-hidden rounded-full bg-fill-muted shadow-sm">
                    {shown && (
                        // A blob: URL cannot go through next/image without turning
                        // off optimisation for it, which buys nothing here.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={shown}
                            alt="Company profile"
                            className="size-full object-cover"
                        />
                    )}
                </div>

                {onPhotoChange && (
                    <div
                        className="absolute bottom-1 right-1 z-10"
                        ref={dropdownRef}
                    >
                        <button
                            type="button"
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="flex items-center gap-1 rounded-md border border-line bg-surface-white px-2.5 py-1 type-xs !font-[500] text-ink shadow-md transition hover:bg-fill-subtle cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand"
                            aria-expanded={isOpen}
                            aria-label="Edit profile photo"
                        >
                            <Pencil className="size-3 text-ink-soft" />
                            <span>{isRemoving ? 'Removing…' : 'Edit'}</span>
                        </button>

                        {isOpen && (
                            <div className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-md border border-line bg-surface-white py-1 shadow-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        fileRef.current?.click();
                                    }}
                                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left type-xs text-ink hover:bg-fill-subtle transition-colors cursor-pointer"
                                >
                                    <Upload className="size-3.5 text-ink-soft" />
                                    Upload a photo...
                                </button>

                                {Boolean(pendingPhoto || photoUrl) &&
                                    onPhotoRemove && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOpen(false);
                                                if (pendingPhoto) {
                                                    onPhotoChange?.(null);
                                                } else {
                                                    onPhotoRemove();
                                                }
                                            }}
                                            disabled={isRemoving}
                                            className="flex w-full items-center gap-2 border-t border-line/60 px-2.5 py-1.5 text-left type-xs text-danger hover:bg-danger-wash transition-colors cursor-pointer disabled:opacity-60"
                                        >
                                            <Trash2 className="size-3.5 text-danger" />
                                            {pendingPhoto
                                                ? 'Discard new photo'
                                                : 'Remove photo'}
                                        </button>
                                    )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
            />

            {onPhotoChange && (
                <>
                    {pendingPhoto && !error && (
                        <p className="mt-2 text-center type-xs text-ink-soft">
                            Saved when you select Save.
                        </p>
                    )}

                    <FieldError message={error} />
                </>
            )}

            {/* Read-only: these come from accountType, which is not editable
                here — it decides which provider/receiver rows a company owns,
                and no endpoint changes it. So the chips carry no remove
                button, rather than one that only pretends to work. */}
            <RoleTags
                accountType={accountType}
                className="mt-4 gap-2"
                tagClassName="min-h-[32px] px-3 type-sm"
            />
        </div>
    );
}
