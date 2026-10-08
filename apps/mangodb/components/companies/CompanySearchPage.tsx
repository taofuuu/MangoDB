'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {
    CompanyListResponse,
    CompanySortOrder,
    CompanySummary,
} from '@mangodb/shared';
import { Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { describeError, isNotSignedIn, NOT_SIGNED_IN } from '@/lib/api';
import { searchCompanies } from '@/lib/companies';
import { COMPANY_PAGE_SIZE } from '@/lib/pagination';
import CompanySearchCard from './CompanySearchCard';
import CompanySearchDetail from './CompanySearchDetail';
import CompanyOrderDropdown from './CompanyOrderDropdown';
import CompanyViewToggle, { type CompanyView } from './CompanyViewToggle';

export default function CompanySearchPage() {
    const [view, setView] = useState<CompanyView>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [orderBy, setOrderBy] = useState<CompanySortOrder>('nameAsc');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<CompanyListResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedCompany, setSelectedCompany] =
        useState<CompanySummary | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const nextSearch = searchQuery.trim();
        if (nextSearch === debouncedSearch) return;

        const timer = window.setTimeout(() => {
            setDebouncedSearch(nextSearch);
            setPage(1);
            setSelectedCompany(null);
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchQuery, debouncedSearch]);

    useEffect(() => {
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        searchCompanies(
            page,
            COMPANY_PAGE_SIZE,
            debouncedSearch || undefined,
            orderBy,
        )
            .then((data) => {
                if (cancelled) return;
                setResult(data);
                listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;
                setError(
                    isNotSignedIn(requestError)
                        ? NOT_SIGNED_IN
                        : describeError(requestError),
                );
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, debouncedSearch, orderBy, reloadKey]);

    const changePage = useCallback((nextPage: number) => {
        setPage(nextPage);
        setSelectedCompany(null);
    }, []);

    const changeView = (nextView: CompanyView) => {
        setView(nextView);
        setSelectedCompany(null);
    };

    const changeOrder = (nextOrder: CompanySortOrder) => {
        setOrderBy(nextOrder);
        setPage(1);
        setSelectedCompany(null);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setPage(1);
        setSelectedCompany(null);
    };

    const companies = result?.items ?? [];
    const pagination = result?.pagination;

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh]">
            <div className="mx-auto max-w-[93.75vw]">
                <header
                    className={`border-b border-brand/50 pb-[1.11vh] transition-all duration-300 ${
                        view === 'list'
                            ? selectedCompany
                                ? 'w-[92.06vw]'
                                : 'mx-auto w-[56.56vw]'
                            : 'w-full'
                    }`}
                >
                    <div className="flex flex-wrap items-end justify-between gap-[1.25vw]">
                        <div>
                            <div className="flex flex-wrap items-baseline gap-[0.63vw]">
                                <h1 className="type-lg !font-[700] text-ink">
                                    All Companies
                                </h1>
                                <span className="type-md text-ink-soft">
                                    {pagination
                                        ? `(Search result: ${pagination.totalItems} items)`
                                        : '(Loading results)'}
                                </span>
                            </div>
                        </div>
                        <CompanyViewToggle value={view} onChange={changeView} />
                    </div>
                </header>

                <div
                    className={`mt-[1.48vh] flex items-center justify-between gap-[1.04vw] transition-all duration-300 ${
                        view === 'list'
                            ? selectedCompany
                                ? 'w-[92.06vw]'
                                : 'mx-auto w-[56.56vw]'
                            : 'w-full'
                    }`}
                >
                    <div className="relative h-[4.07vh] w-[27.86vw] min-w-[260px]">
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute left-[0.83vw] top-1/2 size-5 -translate-y-1/2 text-ink-placeholder"
                        />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            maxLength={100}
                            placeholder="Search"
                            aria-label="Search companies"
                            className="h-full min-h-[40px] w-full rounded-[50px] border border-line bg-white pl-[2.6vw] pr-[2.6vw] type-sm text-ink shadow-card placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                aria-label="Clear company search"
                                className="absolute right-[0.83vw] top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-placeholder hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-[0.52vw] type-xs text-ink-soft">
                        <span>Order by:</span>
                        <CompanyOrderDropdown
                            value={orderBy}
                            onChange={changeOrder}
                        />
                    </div>
                </div>

                {error === NOT_SIGNED_IN && (
                    <div className="mt-[2.22vh] rounded-button border border-line bg-white px-[1.25vw] py-[1.48vh] type-sm text-ink">
                        Please sign in to explore companies.{' '}
                        <Link href="/login" className="text-brand underline">
                            Sign in
                        </Link>
                    </div>
                )}

                {error && error !== NOT_SIGNED_IN && (
                    <div
                        role="alert"
                        className="mt-[2.22vh] rounded-button border border-danger/30 bg-danger/5 px-[1.25vw] py-[1.48vh] type-sm text-danger"
                    >
                        <p>{error}</p>
                        <Button
                            variant="outline"
                            onClick={() => setReloadKey((key) => key + 1)}
                            className="mt-[1.11vh] min-h-[40px] px-[1.04vw] type-sm"
                        >
                            Try again
                        </Button>
                    </div>
                )}

                {!error && (
                    <div
                        className={`mt-[2.22vh] flex items-start gap-[1.5vw] transition-transform duration-300 ease-in-out ${
                            view === 'list' && !selectedCompany
                                ? 'mx-auto w-full lg:w-fit'
                                : ''
                        }`}
                    >
                        <div
                            className={
                                view === 'list'
                                    ? 'w-[56.56vw] shrink-0'
                                    : 'min-w-0 flex-1'
                            }
                        >
                            <div
                                ref={listRef}
                                aria-busy={isLoading}
                                className="max-h-[68vh] overflow-y-auto px-[0.42vw] py-[0.74vh]"
                            >
                                {isLoading ? (
                                    <div
                                        aria-label="Loading companies"
                                        className={
                                            view === 'grid'
                                                ? 'grid grid-cols-1 gap-x-[1.67vw] gap-y-[2.96vh] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                                : 'flex flex-col gap-[1.48vh]'
                                        }
                                    >
                                        {Array.from({
                                            length:
                                                view === 'grid'
                                                    ? COMPANY_PAGE_SIZE
                                                    : 5,
                                        }).map((_, index) => (
                                            <div
                                                key={index}
                                                className={`animate-pulse bg-line ${
                                                    view === 'grid'
                                                        ? 'h-[28.70vh] min-h-[28.70vh] rounded-input'
                                                        : 'h-[19.9vh] rounded-popup'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                ) : companies.length > 0 ? (
                                    <div
                                        className={
                                            view === 'grid'
                                                ? 'grid grid-cols-1 gap-x-[1.67vw] gap-y-[2.96vh] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                                : 'flex flex-col gap-[1.48vh]'
                                        }
                                    >
                                        {companies.map((company) => (
                                            <CompanySearchCard
                                                key={company.companyId}
                                                company={company}
                                                view={view}
                                                onSelect={setSelectedCompany}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-[9.26vh] text-center">
                                        <h2 className="type-md !font-[600] text-ink">
                                            No companies found
                                        </h2>
                                        <p className="mt-[0.74vh] type-sm text-ink-soft">
                                            {debouncedSearch
                                                ? 'Try a broader company name, service, or technology.'
                                                : 'There are no companies available to browse yet.'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Pagination
                                pagination={pagination}
                                onPageChange={changePage}
                                ariaLabel="Company search result pages"
                                isLoading={isLoading}
                            />
                        </div>

                        <CompanySearchDetail
                            company={selectedCompany}
                            view={view}
                            onClose={() => setSelectedCompany(null)}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
