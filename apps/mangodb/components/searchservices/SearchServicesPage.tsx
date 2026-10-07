'use client';

import { useEffect, useState } from 'react';
import { describeError, isNotSignedIn } from '@/lib/api';
import {
    fetchSearchServicesFilterOptions,
    type ServiceFilterOptions,
} from '@/lib/searchServices';
import {
    useSearchServices,
    type SearchServicesMode,
} from '@/lib/useSearchServices';
import { SearchServicesActiveFilters } from './SearchServicesActiveFilters';
import { SearchServicesFilterSidebar } from './SearchServicesFilterSidebar';
import { SearchServicesResultsGrid } from './SearchServicesResultsGrid';
import { SearchServicesBar } from './SearchServicesBar';

// mode is a prop, not hardcoded, so whichever pagination style the final
// design settles on (page numbers vs. infinite scroll) is a one-line change
// where this component is rendered — see app/matching/page.tsx.
export function SearchServicesPage({
    mode = 'pagination',
}: {
    mode?: SearchServicesMode;
}) {
    const {
        items,
        pagination,
        status,
        error,
        filters,
        orderBy,
        hasMore,
        search,
        setOrderBy,
        setFilters,
        clearFilters,
        goToPage,
        loadMore,
    } = useSearchServices(mode);

    const [options, setOptions] = useState<ServiceFilterOptions>({
        categories: [],
        techStack: [],
    });
    const [optionsStatus, setOptionsStatus] = useState<
        'loading' | 'loaded' | 'error'
    >('loading');
    const [optionsError, setOptionsError] = useState<unknown>(null);

    useEffect(() => {
        let active = true;

        void fetchSearchServicesFilterOptions()
            .then((nextOptions) => {
                if (!active) return;
                setOptions(nextOptions);
                setOptionsStatus('loaded');
            })
            .catch((err: unknown) => {
                if (!active) return;
                setOptionsError(err);
                setOptionsStatus('error');
            });

        return () => {
            active = false;
        };
    }, []);

    // Both service requests have the same authentication guard. Wait until
    // the options request settles so a signed-out visitor never sees an empty
    // filter panel or search bar flash before the API answers, then keep both
    // hidden for a 401 from either request.
    const signedOut = isNotSignedIn(error) || isNotSignedIn(optionsError);
    const showSearchControls = optionsStatus !== 'loading' && !signedOut;

    return (
        <div className="mx-auto flex max-w-[1360px] gap-8 px-10 py-10">
            {showSearchControls && (
                <SearchServicesFilterSidebar
                    filters={filters}
                    options={options}
                    optionsError={
                        optionsStatus === 'error'
                            ? describeError(optionsError)
                            : null
                    }
                    onChange={setFilters}
                    onClearAll={clearFilters}
                />
            )}

            <div className="min-w-0 flex-1">
                {/* Divider under the title, per the mockup */}
                <div className="mb-4 flex items-baseline gap-2 border-b border-[var(--color-brand-dark)] pb-2">
                    <h1 className="type-lg text-[var(--color-ink)]">
                        All Services
                    </h1>
                    <span className="type-xs text-[var(--color-ink-soft)]">
                        (Search result: {pagination?.totalItems ?? 0} items)
                    </span>
                </div>

                {showSearchControls && (
                    <>
                        <SearchServicesBar
                            onSearch={search}
                            orderBy={orderBy}
                            onOrderByChange={setOrderBy}
                        />
                        <SearchServicesActiveFilters filters={filters} />
                    </>
                )}

                <div className="mt-4">
                    <SearchServicesResultsGrid
                        mode={mode}
                        items={items}
                        status={status}
                        error={error}
                        pagination={pagination}
                        hasMore={hasMore}
                        onPageChange={goToPage}
                        onLoadMore={loadMore}
                    />
                </div>
            </div>
        </div>
    );
}
