'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    CompanyAccountDetail,
    CompanyAccountListResponse,
} from '@mangodb/shared';
import { ChevronDown, LayoutGrid, Menu } from 'lucide-react';
import CompanyCard from '@/components/companies/CompanyCard';
import CompanyDetailModal from '@/components/companies/CompanyDetailModal';
import Button from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { getCompanyAccountDetail, getCompanyAccounts } from '@/lib/companies';

const PAGE_SIZE = 12;

function describeError(error: unknown): string {
    if (error instanceof ApiRequestError) {
        if (error.status === 401) {
            return 'Please log in to view Company accounts.';
        }
        if (error.status === 403) {
            return 'Only an administrator can view Company accounts.';
        }
        return error.message;
    }
    return 'Could not reach the server. Please try again.';
}

export default function CompaniesPage() {
    const [page, setPage] = useState(1);
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

    useEffect(() => {
        let cancelled = false;

        getCompanyAccounts(page, PAGE_SIZE)
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
    }, [page, reloadKey]);

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
        setIsLoading(true);
        setError(null);
        setPage(nextPage);
    };

    const retryList = () => {
        setIsLoading(true);
        setError(null);
        setReloadKey((key) => key + 1);
    };

    const pagination = result?.pagination;
    const hasPreviousPage = page > 1;
    const hasNextPage = Boolean(pagination && page < pagination.total_pages);

    return (
        <main className="min-h-screen bg-[#FBFBFB] px-[1.67vw] py-[2.96vh]">
            <div className="mx-auto max-w-[93.75vw]">
                <header className="mb-[2.96vh] flex items-start justify-between gap-[1.67vw]">
                    <div>
                        <h1 className="text-hd leading-tight text-[#171717]">
                            Companies
                        </h1>
                        <p className="mt-[0.37vh] text-lg !font-[400] text-[#666666]">
                            List of companies on the platform
                        </p>
                    </div>

                    <div className="mt-[0.74vh] flex items-center gap-[0.63vw]">
                        <button
                            type="button"
                            disabled
                            title="Account filtering belongs to a separate US6-2 task"
                            className="flex h-[3.70vh] items-center gap-[0.31vw] rounded-button px-[0.63vw] text-xs !font-[500] text-[#666666] disabled:cursor-not-allowed"
                        >
                            ALL
                            <ChevronDown
                                aria-hidden="true"
                                className="h-[1.30vh] w-[0.73vw]"
                            />
                        </button>
                    </div>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-button border border-[#C5483B]/30 bg-[#C5483B]/5 px-[1.25vw] py-[1.48vh] text-sm text-[#C5483B]"
                    >
                        <p>{error}</p>
                        <Button
                            variant="outline"
                            onClick={retryList}
                            className="mt-[1.11vh] h-[4.07vh] px-[1.04vw] text-sm"
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
                                        className="h-[28.70vh] animate-pulse rounded-input bg-[#EDEDED]"
                                    />
                                ))}
                            </div>
                        ) : result && result.items.length > 0 ? (
                            <div className="grid grid-cols-1 gap-x-[1.67vw] gap-y-[2.96vh] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {result.items.map((company) => (
                                    <CompanyCard
                                        key={company.company_id}
                                        company={company}
                                        onSelect={openDetail}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="py-[9.26vh] text-center text-md text-[#666666]">
                                No Company accounts found.
                            </p>
                        )}
                    </div>
                )}

                {!error && pagination && pagination.total_items > 0 && (
                    <nav
                        aria-label="Company account pages"
                        className="mt-[2.22vh] flex items-center justify-between gap-[1.04vw]"
                    >
                        <p className="text-sm text-[#666666]">
                            Showing {(page - 1) * pagination.page_size + 1}–
                            {Math.min(
                                page * pagination.page_size,
                                pagination.total_items,
                            )}{' '}
                            of {pagination.total_items}
                        </p>
                        <div className="flex items-center gap-[0.63vw]">
                            <Button
                                variant="outline"
                                disabled={!hasPreviousPage || isLoading}
                                onClick={() => changePage(page - 1)}
                                className="h-[4.63vh] px-[1.04vw] text-sm"
                            >
                                Previous
                            </Button>
                            <span className="min-w-[5.21vw] text-center text-sm text-[#4B4B4B]">
                                Page {page} of {pagination.total_pages}
                            </span>
                            <Button
                                variant="outline"
                                disabled={!hasNextPage || isLoading}
                                onClick={() => changePage(page + 1)}
                                className="h-[4.63vh] px-[1.04vw] text-sm"
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
