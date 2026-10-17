'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    RegisterAccountType,
    CompanyAccountDetail,
    CompanyAccountSummary,
    Paginated,
} from '@mangodb/shared';
import { Search, X } from 'lucide-react';
import CompanyCard from '@/components/companies/CompanyCard';
import CompanyDetailModal from '@/components/companies/CompanyDetailModal';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Pagination from '@/components/ui/Pagination';
import AdminUnauthorizedPage from '@/components/auth/AdminUnauthorizedPage';
import { getCompanyAccountDetail, listCompanyAccounts } from '@/lib/companies';
import { describeError, isForbidden, isNotSignedIn } from '@/lib/api';
import { COMPANY_PAGE_SIZE } from '@/lib/pagination';

type FilterOption = 'ALL' | RegisterAccountType;

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
    { value: 'ALL', label: 'ALL' },
    { value: 'PROVIDER', label: 'PROVIDER' },
    { value: 'RECEIVER', label: 'RECEIVER' },
    { value: 'BOTH', label: 'BOTH' },
];

export default function AdminCompaniesPage() {
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filter, setFilter] = useState<FilterOption>('ALL');
    const [result, setResult] =
        useState<Paginated<CompanyAccountSummary> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adminAuthStatus, setAdminAuthStatus] = useState<
        'unauthorized' | 'forbidden' | null
    >(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [selectedCompany, setSelectedCompany] =
        useState<CompanyAccountDetail | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

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
        let cancelled = false;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setError(null);
        setAdminAuthStatus(null);

        listCompanyAccounts(page, COMPANY_PAGE_SIZE, {
            q: debouncedSearch || undefined,
            filter: filter === 'ALL' ? undefined : filter,
        })
            .then((data) => {
                if (cancelled) return;
                setResult(data);
                listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;
                if (isForbidden(requestError)) {
                    setAdminAuthStatus('forbidden');
                    return;
                }
                if (isNotSignedIn(requestError)) {
                    setAdminAuthStatus('unauthorized');
                    return;
                }
                setError(describeError(requestError));
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
    };

    const pagination = result?.pagination;
    const visibleCompanies = (result?.items ?? []).filter(
        (company) => company.accountType !== 'ADMIN',
    );

    if (!result && !error && !adminAuthStatus) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (adminAuthStatus) {
        return (
            <AdminUnauthorizedPage
                isForbidden={adminAuthStatus === 'forbidden'}
            />
        );
    }

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh]">
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
                                className="pointer-events-none absolute left-[0.63vw] h-[1.67vh] w-[0.83vw] text-ink-placeholder"
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
                                className="h-[3.70vh] w-[14vw] min-w-[180px] rounded-button border border-line bg-white pl-[1.88vw] pr-[1.67vw] type-xs text-ink placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                    className="absolute right-[0.52vw] rounded-full p-[0.16vw] text-ink-placeholder hover:bg-line hover:text-ink focus-visible:outline-none"
                                >
                                    <X
                                        aria-hidden="true"
                                        className="h-[1.48vh] w-[0.73vw]"
                                    />
                                </button>
                            )}
                        </div>

                        <Dropdown
                            value={filter}
                            options={FILTER_OPTIONS}
                            onChange={handleFilterSelect}
                            label="Filter companies by account type"
                            className="w-[9vw] min-w-[130px]"
                        />
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
                        className="max-h-[62.96vh] overflow-y-auto pr-[0.63vw]"
                    >
                        {isLoading ? (
                            <div
                                className="grid grid-cols-1 gap-x-[1.67vw] gap-y-[2.96vh] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                aria-label="Loading Company accounts"
                            >
                                {Array.from({
                                    length: COMPANY_PAGE_SIZE,
                                }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-[28.70vh] animate-pulse rounded-input bg-line"
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

                <Pagination
                    pagination={error ? null : pagination}
                    onPageChange={changePage}
                    ariaLabel="Company account pages"
                    isLoading={isLoading}
                />
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
