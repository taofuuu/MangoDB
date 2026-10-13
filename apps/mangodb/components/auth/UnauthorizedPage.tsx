'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export interface UnauthorizedPageProps {
    title?: string;
    message?: ReactNode;
    homeHref?: string;
    loginHref?: string;
    homeLabel?: string;
    loginLabel?: string;
}

export default function UnauthorizedPage({
    title = 'Login Required',
    message = 'You need to be logged in to access this page.',
    homeHref = '/',
    loginHref = '/login',
    homeLabel = 'Back to Home',
    loginLabel = 'Log In',
}: UnauthorizedPageProps) {
    return (
        <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
            <div className="w-full max-w-[480px] bg-surface-white rounded-2xl p-8 shadow-sm border border-line flex flex-col items-center">
                {/* Lock / Key Icon */}
                <div className="w-16 h-16 rounded-full bg-brand-tint border border-brand/30 flex items-center justify-center mb-5">
                    <svg
                        className="w-8 h-8 text-brand"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                </div>

                <h1 className="type-hd font-bold text-ink mb-2">{title}</h1>

                <div className="type-sm text-ink-soft mb-6 leading-relaxed">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col sm:flex-row gap-3">
                    <Link
                        href={homeHref}
                        className="flex-1 py-2.5 px-4 rounded-button bg-fill-muted text-surface-white type-sm font-semibold hover:bg-ink-placeholder transition-colors text-center"
                    >
                        {homeLabel}
                    </Link>

                    <Link
                        href={loginHref}
                        className="flex-1 py-2.5 px-4 rounded-button bg-brand text-surface-white type-sm font-semibold hover:bg-brand-dark transition-colors text-center"
                    >
                        {loginLabel}
                    </Link>
                </div>
            </div>
        </main>
    );
}
