'use client';

import { useEffect, useRef, useState } from 'react';
import type { AccountType } from '@mangodb/shared';
import Button from '../ui/Button';
import Tag from '../ui/Tag';

const ROLES: Record<AccountType, string[]> = {
    PROVIDER: ['Provider'],
    RECEIVER: ['Receiver'],
    BOTH: ['Provider', 'Receiver'],
};

const ROLE_FILL: Record<string, string> = {
    Provider: 'bg-[#66A6C5] text-white',
    Receiver: 'bg-[#D36B60] text-white',
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

    // TODO(US1-5): account_type is not editable through PATCH /companies/me —
    // it decides which provider/receiver rows a company owns. Removing a chip
    // is local only until there is an endpoint for changing the account type.
    const [roles, setRoles] = useState(ROLES[accountType]);

    const [lastAccountType, setLastAccountType] = useState(accountType);
    if (lastAccountType !== accountType) {
        setLastAccountType(accountType);
        setRoles(ROLES[accountType]);
    }

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
            <div className="mt-[2.78vh] size-[15.63vw] overflow-hidden rounded-full bg-[#D9D9D9]">
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
                className="mt-[5.6vh] h-[5.46vh] w-[12.66vw] cursor-pointer text-md !font-[600]"
            >
                Change Photo
            </Button>

            <div className="mt-[4.49vh] flex gap-[1.04vw]">
                {roles.map((role) => (
                    <Tag
                        key={role}
                        label={role}
                        onRemove={() =>
                            setRoles(roles.filter((r) => r !== role))
                        }
                        className={`h-[3.33vh] w-[8.48vw] ${ROLE_FILL[role]}`}
                    />
                ))}
            </div>

            {/* Both belong to US1-6 (request account deletion) and the password
                change story, neither of which has an endpoint yet. */}
            <button
                type="button"
                onClick={() => console.log('TODO: change password')}
                className="mt-[3.8vh] cursor-pointer text-md !font-[400] underline"
            >
                Change your password
            </button>

            <button
                type="button"
                onClick={() => console.log('TODO(US1-6): delete account')}
                className="mt-[1.94vh] cursor-pointer text-md !font-[400] underline"
            >
                Delete your account
            </button>
        </div>
    );
}
