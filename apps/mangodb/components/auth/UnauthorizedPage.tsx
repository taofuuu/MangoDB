'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

export interface UnauthorizedPageProps {
    title?: string;
    message?: ReactNode;
    badge?: string;
    variant?: 'brand' | 'danger';
    icon?: 'lock' | 'shield';
    homeHref?: string;
    loginHref?: string;
    homeLabel?: string;
    loginLabel?: string;
    showLogin?: boolean;
    primaryButtonClassName?: string;
}

export default function UnauthorizedPage({
    title = 'Login Required',
    message = 'You need to be logged in to access this page.',
    badge,
    variant = 'brand',
    icon = 'lock',
    homeHref = '/',
    loginHref = '/login',
    homeLabel = 'Back to Home',
    loginLabel = 'Log In',
    showLogin = true,
    primaryButtonClassName,
}: UnauthorizedPageProps) {
    const isDanger = variant === 'danger';

    const iconBadgeStyles = isDanger
        ? 'bg-danger-wash border-danger-tint text-danger'
        : 'bg-brand-tint border-brand/30 text-brand';

    const badgePillStyles = isDanger
        ? 'bg-danger-wash text-danger border-danger-tint'
        : 'bg-fill-subtle text-ink-soft border-line';

    const defaultPrimaryButtonClass = isDanger
        ? 'bg-danger hover:bg-danger-hover text-surface-white'
        : 'bg-brand hover:bg-brand-dark text-surface-white';

    const primaryBtnClass = primaryButtonClassName ?? defaultPrimaryButtonClass;

    return (
        <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
            <div className="w-full max-w-[480px] bg-surface-white rounded-2xl p-8 shadow-sm border border-line flex flex-col items-center">
                {/* Icon Badge */}
                <div
                    className={`w-16 h-16 rounded-full border flex items-center justify-center mb-5 ${iconBadgeStyles}`}
                >
                    {icon === 'shield' ? (
                        <ShieldAlert className="w-8 h-8" aria-hidden="true" />
                    ) : (
                        <Lock className="w-8 h-8" aria-hidden="true" />
                    )}
                </div>

                <h1 className="type-hd font-bold text-ink mb-2">{title}</h1>

                {badge && (
                    <div
                        className={`mb-3 px-3 py-1 rounded-status type-xs font-mono border ${badgePillStyles}`}
                    >
                        {badge}
                    </div>
                )}

                <div className="type-sm text-ink-soft mb-6 leading-relaxed">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href={homeHref}
                        className={`py-2.5 px-4 rounded-button text-surface-white type-sm font-semibold transition-colors text-center ${
                            showLogin
                                ? 'flex-1 bg-fill-muted hover:bg-ink-placeholder'
                                : `w-full sm:w-auto sm:px-8 ${primaryBtnClass}`
                        }`}
                    >
                        {homeLabel}
                    </Link>

                    {showLogin && (
                        <Link
                            href={loginHref}
                            className={`flex-1 py-2.5 px-4 rounded-button type-sm font-semibold transition-colors text-center ${primaryBtnClass}`}
                        >
                            {loginLabel}
                        </Link>
                    )}
                </div>
            </div>
        </main>
    );
}
