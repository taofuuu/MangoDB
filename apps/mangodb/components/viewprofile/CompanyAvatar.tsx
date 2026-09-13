'use client';

import Image from 'next/image';
import { isStorageImage } from '@/lib/images';

type CompanyAvatarProps = {
    name: string;
    // The saved photo, or null when the company has not uploaded one.
    photoUrl: string | null;
    // Diameter in px. next/image wants a number, and the two cards draw the
    // circle at different sizes, so it cannot be a fixed Tailwind class.
    size: number;
    className?: string;
};

// The first letters of the company's name, for when it has no photo. Both
// cards used to show a hardcoded "CP", so every company on the platform wore
// the same badge.
function initials(name: string): string {
    const letters = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0] ?? '')
        .join('');

    return letters.toUpperCase() || '?';
}

export default function CompanyAvatar({
    name,
    photoUrl,
    size,
    className = '',
}: CompanyAvatarProps) {
    // isStorageImage, not a plain null check: companyPhoto is a varchar, and
    // handing next/image a host it was not told about throws mid-render.
    const src = isStorageImage(photoUrl) ? photoUrl : null;

    return (
        <div
            style={{ width: size, height: size }}
            className={`relative shrink-0 overflow-hidden rounded-full bg-accent-bright shadow-inner ${className}`}
        >
            {src ? (
                <Image
                    // Decorative: the company's name is rendered right below.
                    src={src}
                    alt=""
                    width={size}
                    height={size}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span
                    style={{ fontSize: Math.round(size * 0.34) }}
                    className="flex h-full w-full items-center justify-center font-bold text-avatar-initials"
                >
                    {initials(name)}
                </span>
            )}
        </div>
    );
}
