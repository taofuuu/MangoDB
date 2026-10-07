'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    EMPTY_SEARCH_SERVICES_FILTERS,
    searchServices,
    type Pagination,
    type SearchServicesFilters,
    type SearchServicesOrder,
    type ServiceSummary,
} from './searchServices';
import { SERVICE_PAGE_SIZE } from './pagination';

export type SearchServicesMode = 'pagination' | 'infinite';

type State = {
    q: string;
    orderBy: SearchServicesOrder;
    filters: SearchServicesFilters;
    page: number;
    pageSize: number;
    items: ServiceSummary[];
    pagination: Pagination | null;
    status: 'idle' | 'loading' | 'loaded' | 'error';
    error: unknown;
};

const initialState: State = {
    q: '',
    orderBy: 'newest',
    filters: EMPTY_SEARCH_SERVICES_FILTERS,
    page: 1,
    pageSize: SERVICE_PAGE_SIZE,
    items: [],
    pagination: null,
    status: 'idle',
    error: null,
};

// mode: 'pagination' matches the mockup's "page 1/20 · Next" control.
// 'infinite' appends each page's items instead of replacing them, for a
// scroll-to-load-more variant — pass whichever the final design calls for.
export function useSearchServices(mode: SearchServicesMode = 'pagination') {
    const [state, setState] = useState<State>(initialState);
    // Guards against a slow earlier request overwriting a newer one.
    const requestId = useRef(0);

    const runSearch = useCallback(
        async (page: number, replace: boolean) => {
            const thisRequest = ++requestId.current;
            setState((s) => ({ ...s, status: 'loading', error: null }));

            try {
                const result = await searchServices({
                    q: state.q,
                    orderBy: state.orderBy,
                    page,
                    pageSize: state.pageSize,
                    filters: state.filters,
                });
                if (thisRequest !== requestId.current) return; // stale response

                setState((s) => ({
                    ...s,
                    page,
                    items: replace
                        ? result.items
                        : [...s.items, ...result.items],
                    pagination: result.pagination,
                    status: 'loaded',
                }));
            } catch (err) {
                if (thisRequest !== requestId.current) return;
                setState((s) => ({
                    ...s,
                    status: 'error',
                    error: err, // keep the original error so the UI can tell 401 from the rest
                }));
            }
        },
        [state.q, state.orderBy, state.pageSize, state.filters],
    );

    // Re-run from page 1 whenever the query or filters change.
    useEffect(() => {
        void runSearch(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.q, state.orderBy, state.filters, state.pageSize]);

    const search = useCallback((q: string) => {
        setState((s) => ({ ...s, q }));
    }, []);

    const setOrderBy = useCallback((orderBy: SearchServicesOrder) => {
        setState((s) => ({ ...s, orderBy, page: 1 }));
    }, []);

    const setFilters = useCallback((filters: SearchServicesFilters) => {
        setState((s) => ({ ...s, filters }));
    }, []);

    const clearFilters = useCallback(() => {
        setState((s) => ({ ...s, filters: EMPTY_SEARCH_SERVICES_FILTERS }));
    }, []);

    const goToPage = useCallback(
        (page: number) => {
            if (mode !== 'pagination') return;
            void runSearch(page, true);
        },
        [mode, runSearch],
    );

    const loadMore = useCallback(() => {
        if (mode !== 'infinite') return;
        if (!state.pagination) return;
        if (state.page >= state.pagination.totalPages) return;
        void runSearch(state.page + 1, false);
    }, [mode, runSearch, state.page, state.pagination]);

    return {
        ...state,
        search,
        setOrderBy,
        setFilters,
        clearFilters,
        goToPage,
        loadMore,
        hasMore: state.pagination
            ? state.page < state.pagination.totalPages
            : false,
    };
}
