'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Service } from '@mangodb/shared';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { listMyServices } from '@/lib/services';

export default function ServiceEditPicker() {
    const [services, setServices] = useState<Service[] | null>(null);
    const [query, setQuery] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        listMyServices()
            .then(setServices)
            .catch((error: unknown) => {
                setLoadError(
                    isNotSignedIn(error) ? NOT_SIGNED_IN : describeError(error),
                );
            });
    }, []);

    const visibleServices = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!services || !normalizedQuery) return services ?? [];

        return services.filter(
            (service) =>
                service.listingTitle.toLowerCase().includes(normalizedQuery) ||
                String(service.serviceId).includes(normalizedQuery),
        );
    }, [query, services]);

    return (
        <main className="min-h-screen bg-surface px-6 py-12 text-ink">
            <div className="mx-auto w-full max-w-[900px]">
                <p className="type-xs font-semibold uppercase tracking-wide text-brand">
                    Development tool
                </p>
                <h1 className="mt-2 type-hd">Open an edit-service page</h1>
                <p className="mt-3 max-w-2xl type-sm leading-6 text-ink-soft">
                    This temporary page lists services owned by your signed-in
                    company. It can be removed after the View My Services page
                    provides its Edit buttons.
                </p>

                {loadError === NOT_SIGNED_IN && (
                    <div className="mt-8 rounded-button border border-line bg-surface-white p-5">
                        <p className="type-sm">
                            Please{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-brand underline"
                            >
                                sign in
                            </Link>{' '}
                            with a Provider account, then return to this page.
                        </p>
                    </div>
                )}

                {loadError && loadError !== NOT_SIGNED_IN && (
                    <p
                        role="alert"
                        className="mt-8 rounded-button border border-danger/30 bg-danger-wash p-4 type-sm text-danger-deep"
                    >
                        {loadError}
                    </p>
                )}

                {!loadError && services === null && (
                    <p className="mt-8 type-sm text-ink-soft">
                        Loading your services…
                    </p>
                )}

                {services && (
                    <section className="mt-8 rounded-popup border border-line bg-surface-white p-6 shadow-sm">
                        <label
                            htmlFor="service-picker-search"
                            className="block type-sm font-semibold"
                        >
                            Find by service title or listing ID
                        </label>
                        <input
                            id="service-picker-search"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Example: Website redesign or 364"
                            className="mt-2 w-full rounded-input border border-line px-3 py-2 type-sm placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />

                        <div className="mt-6 space-y-3">
                            {visibleServices.map((service) => (
                                <article
                                    key={service.serviceId}
                                    className="flex flex-col gap-4 rounded-button border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <h2 className="truncate type-sm font-semibold text-ink">
                                            {service.listingTitle}
                                        </h2>
                                        <p className="mt-1 type-xs text-ink-soft">
                                            Service ID: {service.serviceId} ·{' '}
                                            {service.listingStatus === 'OPEN'
                                                ? 'Open'
                                                : 'Closed'}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/services/${service.serviceId}/edit`}
                                        className="shrink-0 rounded-button bg-brand px-4 py-2 text-center type-sm font-semibold text-surface-white transition-colors hover:bg-brand-dark"
                                    >
                                        Open edit page
                                    </Link>
                                </article>
                            ))}

                            {visibleServices.length === 0 && (
                                <p className="py-6 text-center type-sm text-ink-soft">
                                    {services.length === 0
                                        ? 'This company has no services yet.'
                                        : 'No services match that title or listing ID.'}
                                </p>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
