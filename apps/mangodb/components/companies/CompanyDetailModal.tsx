'use client';

import { useEffect } from 'react';
import type { CompanyAccountDetail } from '@mangodb/shared';
import { Star, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface CompanyDetailModalProps {
    company: CompanyAccountDetail | null;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
}

interface DetailRowProps {
    label: string;
    value: string | null;
}

function DetailRow({ label, value }: DetailRowProps) {
    return (
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-[1.04vw] border-b border-[#E5E5E5] py-[1.11vh]">
            <dt className="text-sm !font-[600] text-[#666666]">{label}</dt>
            <dd className="min-w-0 break-words text-sm text-[#171717]">
                {value || 'Not provided'}
            </dd>
        </div>
    );
}

export default function CompanyDetailModal({
    company,
    isLoading,
    error,
    onClose,
}: CompanyDetailModalProps) {
    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    const isProvider =
        company?.account_type === 'PROVIDER' ||
        company?.account_type === 'BOTH';
    const isReceiver =
        company?.account_type === 'RECEIVER' ||
        company?.account_type === 'BOTH';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-[2.08vw]"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="company-detail-title"
                className="modal-scrollbar max-h-[92vh] w-full max-w-[45vw] overflow-y-auto rounded-popup bg-[#FFFDF9] p-[2.08vw] shadow-xl"
            >
                <div className="mb-[1.85vh] flex items-start justify-between gap-[1.04vw]">
                    <div>
                        <p className="mb-[0.56vh] text-sm text-[#666666]">
                            Company account detail
                        </p>
                        <h2
                            id="company-detail-title"
                            className="text-lg !font-[700] text-[#171717]"
                        >
                            {company?.company_name ?? 'Loading company'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Company details"
                        className="rounded-button p-[0.52vw] text-[#666666] hover:bg-[#EDEDED] focus-visible:ring-2 focus-visible:ring-[#497B93] focus-visible:outline-none"
                    >
                        <X
                            aria-hidden="true"
                            className="h-[2.22vh] w-[1.25vw]"
                        />
                    </button>
                </div>

                {isLoading && (
                    <p className="py-[5.56vh] text-center text-md text-[#666666]">
                        Loading Company information…
                    </p>
                )}

                {error && !isLoading && (
                    <div role="alert" className="py-[3.70vh] text-center">
                        <p className="mb-[1.85vh] text-sm text-[#C5483B]">
                            {error}
                        </p>
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-[4.63vh] px-[1.25vw] text-sm"
                        >
                            Close
                        </Button>
                    </div>
                )}

                {company && !isLoading && !error && (
                    <>
                        <div className="mb-[1.85vh] flex flex-wrap items-center gap-[0.52vw]">
                            {isProvider && (
                                <span className="rounded-status bg-[#D36B60] px-[0.83vw] py-[0.37vh] text-xs !font-[600] text-white">
                                    Provider
                                </span>
                            )}
                            {isReceiver && (
                                <span className="rounded-status bg-[#66A6C5] px-[0.83vw] py-[0.37vh] text-xs !font-[600] text-white">
                                    Receiver
                                </span>
                            )}
                            <span className="ml-auto inline-flex items-center gap-[0.31vw] text-sm text-[#666666]">
                                <Star
                                    aria-hidden="true"
                                    className="h-[1.67vh] w-[0.94vw] fill-[#FABC3F] text-[#FABC3F]"
                                />
                                {company.average_rating?.toFixed(1) ??
                                    'No rating'}
                                {company.rating_count > 0 &&
                                    ` (${company.rating_count})`}
                            </span>
                        </div>

                        <p className="mb-[1.85vh] text-sm leading-relaxed text-[#4B4B4B]">
                            {company.company_description ||
                                'No company description provided.'}
                        </p>

                        <dl>
                            <DetailRow
                                label="Username"
                                value={company.username}
                            />
                            <DetailRow
                                label="Sign-in email"
                                value={company.email}
                            />
                            <DetailRow
                                label="Contact email"
                                value={company.contact_email}
                            />
                            <DetailRow label="Phone" value={company.phone} />
                            <DetailRow
                                label="Address"
                                value={company.address}
                            />
                            <DetailRow
                                label="Website"
                                value={company.website}
                            />
                            <DetailRow
                                label="Company type"
                                value={company.company_type.join(', ')}
                            />
                            {isProvider && (
                                <>
                                    <DetailRow
                                        label="Service terms"
                                        value={company.service_term}
                                    />
                                    <DetailRow
                                        label="Warranty policy"
                                        value={company.warranty_policy}
                                    />
                                </>
                            )}
                        </dl>

                        <div className="mt-[2.22vh] flex justify-end">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="h-[4.63vh] px-[1.25vw] text-sm"
                            >
                                Close
                            </Button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
