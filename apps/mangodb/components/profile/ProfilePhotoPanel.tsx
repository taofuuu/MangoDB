'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { AccountType } from '@mangodb/shared';
import Button from '../ui/Button';
import FieldError from '../ui/FieldError';
import Tag from '../ui/Tag';

const ROLES: Record<AccountType, string[]> = {
    PROVIDER: ['Provider'],
    RECEIVER: ['Receiver'],
    BOTH: ['Provider', 'Receiver'],
    // An administrator offers and requests nothing, so it wears no tag. The
    // key still has to be here: Record<AccountType, ...> demands every one.
    ADMIN: [],
};

// Matches CompanyCard and CompanyDetailModal. These two used to be the other
// way round here, so the same company was blue on this page and terracotta on
// the admin list.
const ROLE_FILL: Record<string, string> = {
    Provider: 'bg-role-provider text-white',
    Receiver: 'bg-brand-light text-white',
};

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
    onPhotoChange?: ((file: File) => void) | undefined;
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
            <div className="mt-[2.78vh] size-[15.63vw] overflow-hidden rounded-full bg-fill-muted">
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

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
            />

            {onPhotoChange && (
                <>
                    <Button
                        variant="outline"
                        onClick={() => fileRef.current?.click()}
                        className="mt-[5.6vh] h-[5.46vh] w-[12.66vw] cursor-pointer type-md !font-[600]"
                    >
                        Change Photo
                    </Button>

                    {pendingPhoto && !error && (
                        <p className="mt-[0.93vh] type-sm text-ink-soft">
                            Saved when you select Save.
                        </p>
                    )}

                    {/* Only with a stored photo to clear: a pending one is
                        dropped by Cancel, which is not what this does. */}
                    {photoUrl && !pendingPhoto && onPhotoRemove && (
                        <button
                            type="button"
                            onClick={onPhotoRemove}
                            disabled={isRemoving}
                            className="mt-[0.93vh] cursor-pointer type-sm !font-[600] text-danger hover:text-danger-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRemoving ? 'Removing…' : 'Remove photo'}
                        </button>
                    )}

                    <FieldError message={error} />
                </>
            )}

            {/* Read-only: these come from accountType, which is not editable
                here — it decides which provider/receiver rows a company owns,
                and no endpoint changes it. So the chips carry no remove
                button, rather than one that only pretends to work. */}
            <div className="mt-[4.49vh] flex gap-[1.04vw]">
                {ROLES[accountType].map((role) => (
                    <Tag
                        key={role}
                        label={role}
                        className={`h-[3.33vh] w-[8.48vw] ${ROLE_FILL[role]}`}
                    />
                ))}
            </div>
        </div>
    );
}
