'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    AccountType,
    CompanyAccountDetail,
    CompanyAccountListResponse,
} from '@mangodb/shared';
import { ChevronDown, LayoutGrid, Menu, Search, X } from 'lucide-react';
import CompanyCard from '@/components/companies/CompanyCard';
import CompanyDetailModal from '@/components/companies/CompanyDetailModal';
import Button from '@/components/ui/Button';
import { getCompanyAccountDetail, getCompanyAccounts } from '@/lib/companies';
import { describeError } from '@/lib/api';

const PAGE_SIZE = 12;

type FilterOption = 'ALL' | Exclude<AccountType, 'ADMIN'>;

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
    { value: 'ALL', label: 'ALL' },
    { value: 'PROVIDER', label: 'PROVIDER' },
    { value: 'RECEIVER', label: 'RECEIVER' },
    { value: 'BOTH', label: 'BOTH' },
];

export default function CompaniesPage() {
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState<FilterOption>('ALL');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [result, setResult] = useState<CompanyAccountListResponse | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedCompany, setSelectedCompany] =
        useState<CompanyAccountDetail | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const nextSearch = searchQuery.trim();
        if (nextSearch === debouncedSearch) return;

        const timer = setTimeout(() => {
            setDebouncedSearch(nextSearch);
            setPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearch]);

    useEffect(() => {
        if (!isFilterOpen) return;

        function handleClickOutside(event: MouseEvent) {
            if (
                filterRef.current &&
                !filterRef.current.contains(event.target as Node)
            ) {
                setIsFilterOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsFilterOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFilterOpen]);

    useEffect(() => {
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);

        getCompanyAccounts(page, PAGE_SIZE, {
            q: debouncedSearch || undefined,
            filter: filter === 'ALL' ? undefined : filter,
        })
            .then((data) => {
                if (cancelled) return;
                setResult(data);
                listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch((requestError: unknown) => {
                if (!cancelled) setError(describeError(requestError));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, debouncedSearch, filter, reloadKey]);

    const closeDetail = useCallback(() => {
        setIsDetailOpen(false);
        setSelectedCompany(null);
        setDetailError(null);
    }, []);

    const openDetail = async (companyId: number) => {
        setIsDetailOpen(true);
        setIsDetailLoading(true);
        setSelectedCompany(null);
        setDetailError(null);

        try {
            setSelectedCompany(await getCompanyAccountDetail(companyId));
        } catch (requestError) {
            setDetailError(describeError(requestError));
        } finally {
            setIsDetailLoading(false);
        }
    };

    const changePage = (nextPage: number) => {
        setPage(nextPage);
    };

    const retryList = () => {
        setReloadKey((key) => key + 1);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedSearch('');
        setPage(1);
    };

    const handleFilterSelect = (selected: FilterOption) => {
        if (selected !== filter) {
            setFilter(selected);
            setPage(1);
        }
        setIsFilterOpen(false);
    };

    const pagination = result?.pagination;
    const visibleCompanies = (result?.items ?? []).filter(
        (company) => company.accountType !== 'ADMIN',
    );
    const hasPreviousPage = page > 1;
    const hasNextPage = Boolean(pagination && page < pagination.totalPages);

    return (
        <main className="min-h-screen bg-surface-soft px-[1.67vw] py-[2.96vh]">
            <div className="mx-auto max-w-[93.75vw]">
                <header className="mb-[2.96vh] flex flex-wrap items-start justify-between gap-[1.67vw]">
                    <div>
                        <h1 className="type-hd leading-tight text-ink">
                            Companies
                        </h1>
                        <p className="mt-[0.37vh] type-lg !font-[400] text-ink-soft">
                            List of companies on the platform
                        </p>
                    </div>

                    <div className="mt-[0.74vh] flex flex-wrap items-center gap-[0.63vw]">
                        <div className="relative flex items-center">
                            <Search
                                aria-hidden="true"
                                className="pointer-events-none absolute left-[0.63vw] h-[1.67vh] w-[0.83vw] text-ink-placeholder-2"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) =>
                                    handleSearchChange(e.target.value)
                                }
                                maxLength={100}
                                placeholder="Search companies..."
                                aria-label="Search companies by keyword"
                                className="h-[3.70vh] w-[14vw] min-w-[180px] rounded-button border border-line-soft bg-white pl-[1.88vw] pr-[1.67vw] type-xs text-ink placeholder:text-ink-placeholder-2 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                    className="absolute right-[0.52vw] rounded-full p-[0.16vw] text-ink-placeholder-2 hover:bg-line-faint hover:text-ink focus-visible:outline-none"
                                >
                                    <X
                                        aria-hidden="true"
                                        className="h-[1.48vh] w-[0.73vw]"
                                    />
                                </button>
                            )}
                        </div>

                        <div ref={filterRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setIsFilterOpen((prev) => !prev)}
                                aria-expanded={isFilterOpen}
                                aria-haspopup="listbox"
                                aria-label="Filter companies by account type"
                                className="flex h-[3.70vh] items-center gap-[0.31vw] rounded-button border border-line-soft bg-white px-[0.63vw] type-xs !font-[500] text-ink hover:bg-line-fainter focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                            >
                                {filter}
                                <ChevronDown
                                    aria-hidden="true"
                                    className={`h-[1.30vh] w-[0.73vw] text-ink-soft transition-transform duration-200 ${
                                        isFilterOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {isFilterOpen && (
                                <div
                                    role="listbox"
                                    aria-label="Account type options"
                                    className="absolute right-0 top-full z-50 mt-[0.37vh] min-w-[7.5vw] rounded-button border border-line-soft bg-white py-[0.37vh] shadow-md"
                                >
                                    {FILTER_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="option"
                                            aria-selected={
                                                filter === option.value
                                            }
                                            onClick={() =>
                                                handleFilterSelect(option.value)
                                            }
                                            className={`block w-full px-[0.83vw] py-[0.74vh] text-left type-xs !font-[500] transition-colors hover:bg-line-fainter ${
                                                filter === option.value
                                                    ? 'bg-brand/10 font-semibold text-brand'
                                                    : 'text-ink'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-button border border-danger/30 bg-danger/5 px-[1.25vw] py-[1.48vh] type-sm text-danger"
                    >
                        <p>{error}</p>
                        <Button
                            variant="outline"
                            onClick={retryList}
                            className="mt-[1.11vh] h-[4.07vh] px-[1.04vw] type-sm"
                        >
                            Try again
                        </Button>
                    </div>
                )}

                {!error && (
                    <div
                        ref={listRef}
                        className="modal-scrollbar max-h-[62.96vh] overflow-y-auto pr-[0.63vw]"
                    >
                        {isLoading ? (
                            <div
                                className="grid grid-cols-1 gap-x-[1.67vw] gap-y-[2.96vh] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                aria-label="Loading Company accounts"
                            >
                                {Array.from({ length: 8 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-[28.70vh] animate-pulse rounded-input bg-line-faint"
                                    />
                                ))}
                            </div>
                        ) : result && visibleCompanies.length > 0 ? (
                            <div className="grid grid-cols-1 gap-x-[1.67vw] gap-y-[2.96vh] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {visibleCompanies.map((company) => (
                                    <CompanyCard
                                        key={company.companyId}
                                        company={company}
                                        onSelect={openDetail}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="py-[9.26vh] text-center type-md text-ink-soft">
                                {debouncedSearch || filter !== 'ALL'
                                    ? 'No Company accounts found matching your search or filter.'
                                    : 'No Company accounts found.'}
                            </p>
                        )}
                    </div>
                )}

                {!error && pagination && pagination.totalItems > 0 && (
                    <nav
                        aria-label="Company account pages"
                        className="mt-[2.22vh] flex items-center justify-between gap-[1.04vw]"
                    >
                        <p className="type-sm text-ink-soft">
                            Showing {(page - 1) * pagination.pageSize + 1}–
                            {Math.min(
                                page * pagination.pageSize,
                                pagination.totalItems,
                            )}{' '}
                            of {pagination.totalItems}
                        </p>
                        <div className="flex items-center gap-[0.63vw]">
                            <Button
                                variant="outline"
                                disabled={!hasPreviousPage || isLoading}
                                onClick={() => changePage(page - 1)}
                                className="h-[4.63vh] px-[1.04vw] type-sm"
                            >
                                Previous
                            </Button>
                            <span className="min-w-[5.21vw] text-center type-sm text-ink-muted">
                                Page {page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                disabled={!hasNextPage || isLoading}
                                onClick={() => changePage(page + 1)}
                                className="h-[4.63vh] px-[1.04vw] type-sm"
                            >
                                Next
                            </Button>
                        </div>
                    </nav>
                )}
            </div>

            {isDetailOpen && (
                <CompanyDetailModal
                    company={selectedCompany}
                    isLoading={isDetailLoading}
                    error={detailError}
                    onClose={closeDetail}
                />
            )}
        </main>
    );
}
