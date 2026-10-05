'use client';

import { useEffect, useState } from 'react';
import { fetchSearchServicesFilterOptions } from '@/lib/searchServices';
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
        filters,
        hasMore,
        search,
        setFilters,
        clearFilters,
        goToPage,
        loadMore,
    } = useSearchServices(mode);

    const [options, setOptions] = useState({
        categories: [] as string[],
        companyTypes: [] as string[],
        techStack: [] as string[],
    });

    useEffect(() => {
        void fetchSearchServicesFilterOptions().then(setOptions);
    }, []);

    return (
        <div className="mx-auto flex max-w-[1360px] gap-8 px-10 py-10">
            <SearchServicesFilterSidebar
                filters={filters}
                options={options}
                onChange={setFilters}
                onClearAll={clearFilters}
            />

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

                <SearchServicesBar onSearch={search} />
                <SearchServicesActiveFilters filters={filters} />

                <div className="mt-4">
                    <SearchServicesResultsGrid
                        mode={mode}
                        items={items}
                        status={status}
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
