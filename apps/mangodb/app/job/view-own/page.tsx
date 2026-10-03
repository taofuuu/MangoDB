'use client';

import { useEffect, useState, useRef } from 'react';

import type {
    JobPostingListResponse,
} from '@mangodb/shared';

import OwnJobBox from '@/components/job/OwnJobBox';
import { describeError } from '@/lib/api';
import {
    getMyJobPostings,
} from '@/lib/job';
import Button from '@/components/ui/Button';

const PAGE_SIZE = 6;

type JobStatus = '' | 'OPEN' | 'CLOSED';

export default function MyJobPostingsPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<JobStatus>('');

    const [result, setResult] =
        useState<JobPostingListResponse | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);

    const [reloadKey, setReloadKey] = useState(0);

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;

        setIsLoading(true);
        setError(null);

        getMyJobPostings(
            page,
            PAGE_SIZE,
            status ? { status } : undefined,
        )
            .then((data) => {
                if (cancelled) return;
                setResult(data);
            })
            .catch((requestError: unknown) => {
                if (cancelled) return;
                setError(describeError(requestError));
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [page, status, reloadKey]);

    const changePage = (nextPage: number) => {
        setPage(nextPage);

        listRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const retryList = () => {
        setReloadKey((key) => key + 1);
    };

    const pagination = result?.pagination;

    const hasPreviousPage = page > 1;

    const hasNextPage = Boolean(
        pagination && page < pagination.totalPages,
    );

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh]">
            <div className="flex flex-col items-center justify-center">
                <div className="flex flex-col gap-[2.595vh]">
                    <div className="flex flex-col gap-[1.3vh]">
                        <span className="type-lg">My Jobs</span>

                        <hr className="w-[56.56vw] border-0 border-t border-[#497B93]/50" />
                    </div>

                    <div className="flex w-full justify-between">
                        {/* Filter tags */}
                        <div className="mb-[2.22vh] flex items-center gap-[0.63vw]">
                            {[
                                {
                                    label: 'ALL',
                                    value: '',
                                    activeClass:
                                        'bg-[#FEC84A] text-white',
                                },
                                {
                                    label: 'OPEN',
                                    value: 'OPEN',
                                    activeClass:
                                        'bg-[#497B93] text-white',
                                },
                                {
                                    label: 'CLOSED',
                                    value: 'CLOSED',
                                    activeClass:
                                        'bg-[#C5483B] text-white',
                                },
                            ].map((filter) => {
                                const isActive =
                                    status === filter.value;

                                return (
                                    <button
                                        key={filter.label}
                                        type="button"
                                        onClick={() => {
                                            setStatus(
                                                filter.value as JobStatus,
                                            );
                                            setPage(1);
                                        }}
                                        className={`
                                            flex
                                            h-[4.17vh]
                                            w-[6.77vw]
                                            items-center
                                            justify-center
                                            rounded-full
                                            type-md
                                            font-medium
                                            border
                                            transition-colors
                                            ${
                                                isActive
                                                    ? `${filter.activeClass}
                                                       border-transparent
                                                       shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_3px_6px_rgba(0,0,0,0.18)]`
                                                    : `bg-white
                                                       text-ink
                                                       border-line
                                                       shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.12)]
                                                       hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_3px_7px_rgba(0,0,0,0.16)]`
                                            }
                                        `}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsAddOpen(true)}
                            className="flex h-[4.17vh] w-[8.96vw] items-center justify-center rounded-full bg-brand type-md text-surface transition-colors hover:bg-brand-dark"
                        >
                            + Add Job
                        </button>
                    </div>
                </div>

                {/* Job part */}
                <div className="flex h-[72.63vh] w-[56.56vw] flex-col justify-between">
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
                            className="modal-scrollbar max-h-[72.63vh] overflow-y-auto pr-[0.63vw]"
                        >
                            {isLoading ? (
                                <div
                                    className="flex flex-col gap-[3.87vh]"
                                    aria-label="Loading job postings"
                                >
                                    {Array.from({ length: 8 }).map(
                                        (_, index) => (
                                            <div
                                                key={index}
                                                className="flex h-[19.9vh] w-[54.69vw] flex-col gap-[2.22vh] rounded-[30px] bg-line pt-[2.87vh] pr-[2.29vw] pl-[2.29vw] animate-pulse"
                                            />
                                        ),
                                    )}
                                </div>
                            ) : result &&
                              result.items.length > 0 ? (
                                <>
                                    {/* Jobs */}
                                    <div className="flex flex-col gap-[3.87vh] pt-[1vh] pl-[0.5vw]">
                                        {result.items.map((job) => (
                                            <OwnJobBox
                                                key={job.jobPostingId}
                                                job={job}
                                            />
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {pagination &&
                                        pagination.totalItems > 0 && (
                                            <nav
                                                aria-label="Job posting pages"
                                                className="mt-[2.22vh] flex items-center justify-between gap-[1.04vw]"
                                            >
                                                <p className="type-sm text-ink-soft">
                                                    Showing{' '}
                                                    {(page - 1) *
                                                        pagination.pageSize +
                                                        1}
                                                    –
                                                    {Math.min(
                                                        page *
                                                            pagination.pageSize,
                                                        pagination.totalItems,
                                                    )}{' '}
                                                    of{' '}
                                                    {pagination.totalItems}
                                                </p>

                                                <div className="flex items-center gap-[0.63vw]">
                                                    <Button
                                                        variant="outline"
                                                        disabled={
                                                            !hasPreviousPage ||
                                                            isLoading
                                                        }
                                                        onClick={() =>
                                                            changePage(
                                                                page - 1,
                                                            )
                                                        }
                                                        className="h-[4.63vh] px-[1.04vw] type-sm"
                                                    >
                                                        Previous
                                                    </Button>

                                                    <span className="min-w-[5.21vw] text-center type-sm text-ink-soft">
                                                        Page {page} of{' '}
                                                        {
                                                            pagination.totalPages
                                                        }
                                                    </span>

                                                    <Button
                                                        variant="outline"
                                                        disabled={
                                                            !hasNextPage ||
                                                            isLoading
                                                        }
                                                        onClick={() =>
                                                            changePage(
                                                                page + 1,
                                                            )
                                                        }
                                                        className="h-[4.63vh] px-[1.04vw] type-sm"
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </nav>
                                        )}
                                </>
                            ) : (
                                <div className="flex min-h-[20vh] items-center justify-center">
                                    <p className="type-md text-ink-soft">
                                        No job postings found.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}