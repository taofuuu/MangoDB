'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { CompanyProfile } from '@mangodb/shared';
import LogoutButton from '@/components/auth/LogoutButton';
import CompanyAvatar from '@/components/viewprofile/CompanyAvatar';
import {
    NAV_SIZES,
    NAV_THEMES,
    type NavPrefValue,
    readNavPref,
    saveNavPref,
} from '@/lib/navTheme';

// The avatar button and the small panel it opens, like GitHub's profile menu:
// who is signed in at the top, then View profile, Edit profile, Settings and
// Logout, and pickers for the navbar's style and height at the bottom.
//
// The panel stays mounted and is only hidden when closed. LogoutButton owns
// its confirmation modal, so unmounting the panel would unmount the modal too.
// The modal portals to <body>, so a click inside it counts as "outside" this
// menu and closes the panel — but the modal itself stays up.

const ITEM_CLASS =
    'block w-full rounded-lg px-3 py-2 text-left type-sm text-ink transition-colors hover:bg-brand-tint focus-visible:bg-brand-tint focus-visible:outline-none cursor-pointer';

// One option in the style or height picker.
function optionClass(isSelected: boolean): string {
    return `flex items-center gap-2 rounded-lg px-2 py-1.5 text-left type-xs text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand cursor-pointer ${
        isSelected ? 'bg-brand-tint ring-1 ring-brand' : 'hover:bg-brand-tint'
    }`;
}

type ProfileMenuProps = {
    profile: CompanyProfile;
};

export default function ProfileMenu({ profile }: ProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const styleLabelId = useId();
    const heightLabelId = useId();
    // Read straight from storage: this menu only mounts in the browser, after
    // the profile has loaded, so there is no server render to disagree with.
    const [navTheme, setNavTheme] = useState<NavPrefValue<'theme'>>(() =>
        readNavPref('theme'),
    );
    const [navSize, setNavSize] = useState<NavPrefValue<'size'>>(() =>
        readNavPref('size'),
    );

    // Only listen while open: a closed menu has nothing to close.
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-label="Open account menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={panelId}
                // The teal ring marks "you" in the bar, in the app's action
                // colour. It thickens while the menu is open, so the panel
                // visibly belongs to it.
                // p-0.5 makes the gap inside the ring: it is see-through, so
                // it always matches the bar behind it, where ring-offset
                // would need the bar's colour copied here.
                className={`block rounded-full p-0.5 ring-brand transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand cursor-pointer ${
                    isOpen ? 'ring-3' : 'ring-2 hover:ring-3'
                }`}
            >
                <CompanyAvatar
                    name={profile.companyName}
                    photoUrl={profile.companyPhoto}
                    size={36}
                    className="!bg-brand-tint"
                />
            </button>

            <div
                id={panelId}
                hidden={!isOpen}
                // Grows out of the avatar's corner on open. starting: is
                // @starting-style, which animates the switch out of `hidden`.
                className="absolute right-0 top-full z-40 mt-3 w-64 origin-top-right rounded-2xl bg-surface-white p-1.5 shadow-[0_16px_40px_-12px_rgb(30_67_83/0.45)] ring-1 ring-brand-deep/10 transition-[opacity,scale] duration-150 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
            >
                <div className="mb-1 rounded-xl bg-brand-tint px-3 py-2.5">
                    <p className="type-xs text-ink-soft">Signed in as</p>
                    <p className="truncate type-sm !font-[600] text-brand-deep">
                        {profile.companyName}
                    </p>
                    <p className="truncate type-xs text-ink-soft">
                        {profile.email}
                    </p>
                </div>

                <Link
                    href="/profile/view"
                    onClick={() => setIsOpen(false)}
                    className={ITEM_CLASS}
                >
                    View profile
                </Link>
                <Link
                    href="/profile/edit"
                    onClick={() => setIsOpen(false)}
                    className={ITEM_CLASS}
                >
                    Edit profile
                </Link>
                <Link
                    href="/account-settings"
                    onClick={() => setIsOpen(false)}
                    className={ITEM_CLASS}
                >
                    Settings
                </Link>
                {/* The click bubbles up here after LogoutButton opens its
                    modal, so the panel gets out of the way behind it. */}
                <div onClick={() => setIsOpen(false)}>
                    <LogoutButton
                        className={`${ITEM_CLASS} hover:!bg-danger-wash hover:text-danger`}
                    >
                        Logout
                    </LogoutButton>
                </div>

                <div className="mt-1 border-t border-line px-3 pt-2.5 pb-1.5">
                    <p id={styleLabelId} className="type-xs text-ink-soft">
                        Navbar style
                    </p>
                    <div
                        role="radiogroup"
                        aria-labelledby={styleLabelId}
                        className="mt-2 grid grid-cols-2 gap-1.5"
                    >
                        {NAV_THEMES.map((theme) => {
                            const isSelected = theme.id === navTheme;
                            return (
                                <button
                                    key={theme.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    onClick={() => {
                                        setNavTheme(theme.id);
                                        saveNavPref('theme', theme.id);
                                    }}
                                    className={optionClass(isSelected)}
                                >
                                    <span
                                        aria-hidden="true"
                                        style={{
                                            backgroundColor: theme.swatch,
                                        }}
                                        className={`h-4 w-4 shrink-0 rounded-full border border-line ${
                                            theme.id === 'shadow'
                                                ? 'shadow-[0_2px_4px_rgb(30_67_83/0.3)]'
                                                : ''
                                        }`}
                                    />
                                    {theme.label}
                                </button>
                            );
                        })}
                    </div>

                    <p
                        id={heightLabelId}
                        className="mt-3 type-xs text-ink-soft"
                    >
                        Navbar height
                    </p>
                    <div
                        role="radiogroup"
                        aria-labelledby={heightLabelId}
                        className="mt-2 grid grid-cols-2 gap-1.5"
                    >
                        {NAV_SIZES.map((size) => {
                            const isSelected = size.id === navSize;
                            return (
                                <button
                                    key={size.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    onClick={() => {
                                        setNavSize(size.id);
                                        saveNavPref('size', size.id);
                                    }}
                                    className={optionClass(isSelected)}
                                >
                                    {size.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
