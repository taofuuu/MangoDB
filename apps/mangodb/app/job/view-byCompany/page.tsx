'use client';

import { useState } from 'react';

import JobPostingsPage from '@/components/job/JobPostingsPage';

export default function CompanyJobsTestPage() {
    const [companyIdInput, setCompanyIdInput] = useState('');
    const [companyId, setCompanyId] = useState<number | null>(null);

    const handleSearch = () => {
        const id = Number(companyIdInput);

        if (!Number.isInteger(id) || id <= 0) {
            return;
        }

        setCompanyId(id);
    };

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh]">
            <div className="mx-auto flex w-[56.56vw] flex-col gap-[2.22vh]">
                <div className="flex flex-col gap-[1.3vh]">
                    <span className="type-lg">Test Company Jobs</span>

                    <hr className="border-0 border-t border-[#497B93]/50" />
                </div>

                {/* Company ID selector */}
                <div className="flex items-end gap-[0.63vw]">
                    <div className="flex flex-col gap-[0.74vh]">
                        <label htmlFor="companyId" className="type-sm text-ink">
                            Company ID
                        </label>

                        <input
                            id="companyId"
                            type="number"
                            min="1"
                            value={companyIdInput}
                            onChange={(event) =>
                                setCompanyIdInput(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    handleSearch();
                                }
                            }}
                            placeholder="e.g. 248"
                            className="
                                h-[4.17vh]
                                w-[12vw]
                                rounded-full
                                border
                                border-line
                                bg-white
                                px-[1vw]
                                type-sm
                                outline-none
                                focus:border-[#497B93]
                            "
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSearch}
                        className="
                            flex
                            h-[4.17vh]
                            w-[7vw]
                            items-center
                            justify-center
                            rounded-full
                            bg-brand
                            type-md
                            text-surface
                            transition-colors
                            hover:bg-brand-dark
                        "
                    >
                        Search
                    </button>
                </div>

                {/* Selected company */}
                {companyId !== null && (
                    <div className="type-sm text-ink-soft">
                        Showing jobs for company ID:{' '}
                        <span className="font-medium text-ink">
                            {companyId}
                        </span>
                    </div>
                )}

                {/* Job list */}
                {companyId !== null && (
                    <JobPostingsPage view="company" companyId={companyId} />
                )}
            </div>
        </main>
    );
}
