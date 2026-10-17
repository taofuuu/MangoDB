'use client';

import { useId } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanyAccountDetail } from '@mangodb/shared';
import { Star, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import ModalShell from '@/components/ui/ModalShell';
import { isProviderAccount, isReceiverAccount } from '@/lib/roles';

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
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-[1.04vw] border-b border-line py-[1.11vh]">
            <dt className="type-sm !font-[600] text-ink-soft">{label}</dt>
            <dd className="min-w-0 break-words type-sm text-ink">
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
    const router = useRouter();
    const titleId = useId();

    // ?? '': the modal renders before the fetch lands, and both predicates
    // answer false for a type they do not recognise.
    const isProvider = isProviderAccount(company?.accountType ?? '');
    const isReceiver = isReceiverAccount(company?.accountType ?? '');

    // The parent mounts this only while a company is open, so it is always
    // open here.
    return (
        <ModalShell
            isOpen
            onClose={onClose}
            labelledBy={titleId}
            panelClassName="max-h-[92vh] w-full max-w-[45vw] overflow-y-auto rounded-popup bg-surface p-[2.08vw] shadow-xl"
        >
            <div className="mb-[1.85vh] flex items-start justify-between gap-[1.04vw]">
                <div>
                    <p className="mb-[0.56vh] type-sm text-ink-soft">
                        Company account detail
                    </p>
                    <h2 id={titleId} className="type-lg !font-[700] text-ink">
                        {company?.companyName ?? 'Loading company'}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close Company details"
                    className="rounded-button p-[0.52vw] text-ink-soft hover:bg-line focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                    <X aria-hidden="true" className="h-[2.22vh] w-[1.25vw]" />
                </button>
            </div>

            {isLoading && (
                <p className="py-[5.56vh] text-center type-md text-ink-soft">
                    Loading Company information…
                </p>
            )}

            {error && !isLoading && (
                <div role="alert" className="py-[3.70vh] text-center">
                    <p className="mb-[1.85vh] type-sm text-danger">{error}</p>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="h-[4.63vh] px-[1.25vw] type-sm"
                    >
                        Close
                    </Button>
                </div>
            )}

            {company && !isLoading && !error && (
                <>
                    <div className="mb-[1.85vh] flex flex-wrap items-center gap-[0.52vw]">
                        {isProvider && (
                            <span className="rounded-status bg-role-provider px-[0.83vw] py-[0.37vh] type-xs !font-[600] text-white">
                                Provider
                            </span>
                        )}
                        {isReceiver && (
                            <span className="rounded-status bg-brand-light px-[0.83vw] py-[0.37vh] type-xs !font-[600] text-white">
                                Receiver
                            </span>
                        )}
                        <span className="ml-auto inline-flex items-center gap-[0.31vw] type-sm text-ink-soft">
                            <Star
                                aria-hidden="true"
                                className="h-[1.67vh] w-[0.94vw] fill-accent text-accent"
                            />
                            {company.averageRating?.toFixed(1) ?? 'No rating'}
                            {company.ratingCount > 0 &&
                                ` (${company.ratingCount})`}
                        </span>
                    </div>

                    <p className="mb-[1.85vh] type-sm leading-relaxed text-ink-soft">
                        {company.companyDescription ||
                            'No company description provided.'}
                    </p>

                    <dl>
                        <DetailRow label="Username" value={company.username} />
                        <DetailRow
                            label="Sign-in email"
                            value={company.email}
                        />
                        <DetailRow
                            label="Contact email"
                            value={company.contactEmail}
                        />
                        <DetailRow label="Phone" value={company.phone} />
                        <DetailRow label="Address" value={company.address} />
                        <DetailRow label="Website" value={company.website} />
                        <DetailRow
                            label="Company type"
                            value={company.companyType.join(', ')}
                        />
                        {isProvider && (
                            <>
                                <DetailRow
                                    label="Service terms"
                                    value={company.serviceTerm}
                                />
                                <DetailRow
                                    label="Warranty policy"
                                    value={company.warrantyPolicy}
                                />
                            </>
                        )}
                    </dl>

                    <div className="mt-[2.22vh] flex justify-end gap-[0.83vw]">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-[4.63vh] px-[1.25vw] type-sm"
                        >
                            Close
                        </Button>
                        {/* US6-3/US6-4: opens the shared profile form in
                                admin mode for this account, where the Delete
                                account section lives. */}
                        <Button
                            onClick={() =>
                                router.push(
                                    `/profile/edit?companyId=${company.companyId}`,
                                )
                            }
                            className="h-[4.63vh] px-[1.25vw] type-sm"
                        >
                            Edit account
                        </Button>
                    </div>
                </>
            )}
        </ModalShell>
    );
}
