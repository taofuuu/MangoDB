'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CompanyProfile } from '@mangodb/shared';
import { isNotSignedIn } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { applySavedNavPrefs } from '@/lib/navTheme';
import ProfileMenu from './ProfileMenu';

// The bar across the top of every page: logo on the left, the signed-in
// company's avatar on the right.

// The sign-in pages draw their own full-screen layout and have nobody to show
// in the corner yet.
const HIDDEN_ON = ['/login', '/admin/login', '/register'];

// The two searches, the app's main ways in. Uppercase on screen to match the
// Figma navbar's links; the source stays sentence case for screen readers.
// shortLabel is for phones, where the full label wraps onto two lines.
const NAV_LINKS = [
    { href: '/job/view-all', label: 'Search jobs', shortLabel: 'Jobs' },
    {
        href: '/services/search',
        label: 'Search services',
        shortLabel: 'Services',
    },
];

// 'loading' draws an empty circle so the bar does not jump when the photo
// arrives. 'signed-out' means the API said 401; 'error' is anything else, and
// shows nothing rather than a Log in link that would be a lie.
type ProfileState =
    | { status: 'loading' }
    | { status: 'signed-in'; profile: CompanyProfile }
    | { status: 'signed-out' }
    | { status: 'error' };

export default function Navbar() {
    const pathname = usePathname();
    const isHidden = HIDDEN_ON.includes(pathname);
    const [state, setState] = useState<ProfileState>({ status: 'loading' });

    // Once per page load. The layout keeps this mounted across client-side
    // navigation, so moving between pages does not refetch.
    useEffect(() => {
        if (isHidden) return;

        getMyProfile()
            .then((profile) => setState({ status: 'signed-in', profile }))
            .catch((err: unknown) =>
                setState({
                    status: isNotSignedIn(err) ? 'signed-out' : 'error',
                }),
            );
    }, [isHidden]);

    // The <head> script sets the saved style and height before paint. In
    // development, Strict Mode's remount resets <html> to its JSX attributes
    // and drops them, so put them back before paint. A no-op in production.
    useLayoutEffect(() => {
        applySavedNavPrefs();
    }, []);

    if (isHidden) return null;

    return (
        // The colours come from the navbar style picked in the profile menu
        // (--nav-* in globals.css). Every style is light, so the accents
        // inside stay teal, the app's action colour.
        <header className="sticky top-0 z-30 border-b border-(--nav-line) bg-(--nav-bg) shadow-(--nav-shadow)">
            {/* --nav-height: the height picked in the profile menu. */}
            <nav className="flex h-(--nav-height) items-center justify-between gap-6 px-[2.19vw]">
                <Link
                    href="/"
                    aria-label="MangoDB home"
                    className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                    <Image
                        src="/assets/MangoDB_Logo_nobg.png"
                        alt=""
                        width={160}
                        height={48}
                        priority
                        className="h-12 w-auto object-contain"
                    />
                    {/* Hidden on phones, where it would push the links and the
                        avatar off the edge. The logo still says "home". */}
                    <span className="hidden type-sm !font-[600] text-ink sm:inline">
                        MangoDB Cooperation
                    </span>
                </Link>

                <div className="flex items-center gap-4 sm:gap-8 xl:gap-10">
                    <ul className="flex items-center gap-3 sm:gap-6 xl:gap-8">
                        {NAV_LINKS.map((link) => {
                            const isCurrent = pathname.startsWith(link.href);
                            return (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        aria-current={
                                            isCurrent ? 'page' : undefined
                                        }
                                        // The underline marks the page you are
                                        // on, in the app's teal.
                                        className={`block border-b-2 py-1 whitespace-nowrap type-sm !font-[500] uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand max-sm:type-xs ${
                                            isCurrent
                                                ? 'border-brand text-brand-deep'
                                                : 'border-transparent text-ink hover:border-brand/40 hover:text-brand-deep'
                                        }`}
                                    >
                                        <span className="sm:hidden">
                                            {link.shortLabel}
                                        </span>
                                        <span className="max-sm:hidden">
                                            {link.label}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    {state.status === 'loading' && (
                        <div className="h-10 w-10 rounded-full bg-fill-muted" />
                    )}
                    {state.status === 'signed-in' && (
                        <ProfileMenu profile={state.profile} />
                    )}
                    {state.status === 'signed-out' && (
                        <Link
                            href="/login"
                            className="rounded-button bg-brand px-4 py-2 type-sm !font-[600] text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                            Log in
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
