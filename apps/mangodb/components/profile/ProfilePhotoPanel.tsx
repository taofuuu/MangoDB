'use client';

import { useEffect, useRef } from 'react';
import type { AccountType } from '@mangodb/shared';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

const ROLES: Record<AccountType, string[]> = {
    PROVIDER: ['Provider'],
    RECEIVER: ['Receiver'],
    BOTH: ['Provider', 'Receiver'],
    // An administrator offers and requests nothing, so it wears no tag. The
    // key still has to be here: Record<AccountType, ...> demands every one.
    ADMIN: [],
};

const ROLE_FILL: Record<string, string> = {
    Provider: 'bg-brand-light text-white',
    Receiver: 'bg-danger-soft text-white',
};

type ProfilePhotoPanelProps = {
    photoUrl: string | null;
    onPhotoChange: (photoUrl: string) => void;
    accountType: AccountType;
};

export default function ProfilePhotoPanel({
    photoUrl,
    onPhotoChange,
    accountType,
}: ProfilePhotoPanelProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    // Every object URL this panel has handed out, so the previous one is
    // released when a new photo replaces it and the last one on unmount.
    const objectUrl = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (objectUrl.current) {
                URL.revokeObjectURL(objectUrl.current);
            }
        };
    }, []);

    // TODO(US1-5): preview only. There is no upload endpoint and no column on
    // company to store the result, so the photo is lost on reload.
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        if (objectUrl.current) {
            URL.revokeObjectURL(objectUrl.current);
        }

        objectUrl.current = URL.createObjectURL(file);
        onPhotoChange(objectUrl.current);
    };

    return (
        <div className="flex flex-col items-center">
            <div className="mt-[2.78vh] size-[15.63vw] overflow-hidden rounded-full bg-fill-muted">
                {photoUrl && (
                    // A blob: URL cannot go through next/image without turning
                    // off optimisation for it, which buys nothing here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photoUrl}
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

            <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="mt-[5.6vh] h-[5.46vh] w-[12.66vw] cursor-pointer type-md !font-[600]"
            >
                Change Photo
            </Button>

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
