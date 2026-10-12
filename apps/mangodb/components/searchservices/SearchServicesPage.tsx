'use client';

import { useCallback, useEffect, useState } from 'react';
import { describeError, isNotSignedIn } from '@/lib/api';
import {
    fetchSearchServicesFilterOptions,
    type ServiceFilterOptions,
    type ServiceSummary,
} from '@/lib/searchServices';
import {
    useSearchServices,
    type SearchServicesMode,
} from '@/lib/useSearchServices';
import { SearchServicesActiveFilters } from './SearchServicesActiveFilters';
import { SearchServicesFilterSidebar } from './SearchServicesFilterSidebar';
import { SearchServicesResultsGrid } from './SearchServicesResultsGrid';
import { SearchServicesBar } from './SearchServicesBar';
import { ServiceDetailPanel } from './ServiceDetailPanel';

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
    const [selectedService, setSelectedService] =
        useState<ServiceSummary | null>(null);

    const closeDetail = useCallback(() => setSelectedService(null), []);

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

    const headerAndSearch = (
        <>
            <div className="mb-4 flex items-baseline gap-2 border-b border-brand-dark pb-2">
                <h1 className="type-hd text-ink">All Services</h1>
                <span className="type-xs text-ink-soft">
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
        </>
    );

    const results = (
        <SearchServicesResultsGrid
            mode={mode}
            items={items}
            status={status}
            error={error}
            pagination={pagination}
            hasMore={hasMore}
            onPageChange={goToPage}
            onLoadMore={loadMore}
            onViewDetail={setSelectedService}
        />
    );

    if (selectedService) {
        return (
            <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh]">
                <div className="mx-auto max-w-[93.75vw]">
                    <div className="ml-[2vw] w-[91vw]">{headerAndSearch}</div>

                    <div className="mt-[2vh] ml-[2vw] flex items-start gap-[1.5vw]">
                        <div className="h-[72.63vh] min-w-0 w-[56.56vw] flex-none">
                            {results}
                        </div>

                        <div className="h-[72.63vh] w-[35vw] shrink-0">
                            <ServiceDetailPanel
                                key={selectedService.listingId}
                                service={selectedService}
                                onClose={closeDetail}
                            />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

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
                {headerAndSearch}
                <div className="mt-4">{results}</div>
            </div>
        </div>
    );
}
