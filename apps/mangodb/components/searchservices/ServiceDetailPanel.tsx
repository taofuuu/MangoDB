'use client';

import { X } from 'lucide-react';
import {
    formatServiceBudgetRange,
    type ServiceSummary,
} from '@/lib/searchServices';

export function ServiceDetailPanel({
    service,
    onClose,
}: {
    service: ServiceSummary;
    onClose: () => void;
}) {
    return (
        <div
            className="
                flex
                h-[72.63vh]
                w-[34vw]
                flex-col
                rounded-popup
                bg-surface-white
                px-[1.5vw]
                py-[2.5vh]
                text-left
                shadow-[0_0_8px_rgba(73,123,147,0.25)]
            "
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Service Detail</span>

                    <h2 className="type-lg !font-[700] text-ink">
                        {service.listingTitle || '-'}
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close service detail"
                    className="rounded-full p-2 transition hover:bg-fill-subtle"
                >
                    <X size={22} />
                </button>
            </div>

            <hr className="my-[2vh] border-0 border-t border-brand/30" />

            {/* Service Detail */}
            <div className="flex flex-1 flex-col overflow-y-auto pr-[0.5vw]">
                {/* Company */}
                <div className="flex flex-col gap-[0.6vh]">
                    <span className="type-sm text-brand">Company</span>

                    <p className="type-md text-ink pl-[0.5vw]">
                        {service.company.companyName || '-'}
                    </p>
                </div>

                {/* Categories */}
                <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Categories</span>

                    <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                        {service.categories.length > 0 ? (
                            service.categories.map((category) => (
                                <span
                                    key={category}
                                    className="
                                        rounded-status
                                        bg-accent
                                        px-[0.63vw]
                                        py-[0.19vh]
                                        type-sm
                                        !font-[600]
                                        text-ink
                                    "
                                >
                                    {category}
                                </span>
                            ))
                        ) : (
                            <span className="type-sm text-ink-soft">-</span>
                        )}
                    </div>
                </div>

                {/* Budget */}
                <div className="mt-[2vh] flex flex-col gap-[0.6vh]">
                    <span className="type-sm text-brand">Budget</span>

                    <p className="type-md text-ink pl-[0.5vw]">
                        {formatServiceBudgetRange(
                            service.minBudget,
                            service.maxBudget,
                        )}
                    </p>
                </div>

                {/* Tech Stack */}
                <div className="mt-[2vh] flex flex-col gap-[0.8vh]">
                    <span className="type-sm text-brand">Tech Stack</span>

                    <div className="flex flex-wrap gap-[0.42vw] pl-[0.5vw]">
                        {service.techStack.length > 0 ? (
                            service.techStack.map((technology) => (
                                <span
                                    key={technology}
                                    className="
                                        rounded-status
                                        bg-accent
                                        px-[0.63vw]
                                        py-[0.19vh]
                                        type-sm
                                        !font-[600]
                                        text-ink
                                    "
                                >
                                    {technology}
                                </span>
                            ))
                        ) : (
                            <span className="type-sm text-ink-soft">-</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
