'use client';

import { useState } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import PortfolioForm, {
    type PendingPortfolio,
} from '@/components/portfolios/PortfolioForm';

type ServicePortfoliosProps = {
    // Already saved on this service. Edited in place, through the API.
    saved: ServicePortfolio[];
    onSavedChange: (updated: ServicePortfolio) => void;
    // Added on this form, uploaded by ServiceForm once the service is saved.
    pending: PendingPortfolio[];
    onAddPending: (item: PendingPortfolio) => void;
    onRemovePending: (id: string) => void;
};

// The Portfolio column of ServiceForm, with its add and edit dialogs.
export default function ServicePortfolios({
    saved,
    onSavedChange,
    pending,
    onAddPending,
    onRemovePending,
}: ServicePortfoliosProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [toEdit, setToEdit] = useState<ServicePortfolio | null>(null);

    return (
        <div className="w-full md:w-[400px] bg-surface-white rounded-2xl p-6 shadow-sm border border-line flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="type-md font-bold text-ink">Portfolio</h2>
                <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-1.5 border border-brand rounded-button type-xs font-semibold text-brand hover:bg-brand-tint transition-colors"
                >
                    Add Portfolio
                </button>
            </div>

            {saved.length === 0 && pending.length === 0 ? (
                <p className="type-sm text-ink-placeholder text-center mt-4">
                    No portfolio items yet.
                </p>
            ) : (
                <div className="flex-1 overflow-y-auto modal-scrollbar pr-2 space-y-3 max-h-[380px]">
                    {saved.map((item) => (
                        <div
                            key={item.portfolioId}
                            className="flex items-center justify-between border border-line rounded-input p-3 type-sm"
                        >
                            <span className="font-medium text-ink type-xs truncate max-w-[180px]">
                                {item.portfolioName}
                            </span>
                            <div className="ml-2 flex shrink-0 items-center gap-3">
                                <a
                                    href={item.portfolioLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="type-xs font-semibold text-brand hover:underline"
                                >
                                    View
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setToEdit(item)}
                                    className="type-xs font-semibold text-brand hover:underline"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                    {pending.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between border border-line rounded-input p-3 type-sm"
                        >
                            <span className="font-medium text-ink type-xs truncate max-w-[180px]">
                                {item.name}
                                <span className="ml-2 font-normal text-ink-placeholder">
                                    Pending
                                </span>
                            </span>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                {item.image && (
                                    <span className="type-xs text-ink-placeholder italic truncate max-w-[80px]">
                                        {item.image.name}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemovePending(item.id)}
                                    className="type-xs font-semibold text-danger hover:text-danger-hover transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <PortfolioForm
                    mode="add"
                    onClose={() => setIsAdding(false)}
                    onAdd={onAddPending}
                />
            )}

            {toEdit && (
                <PortfolioForm
                    mode="edit"
                    portfolio={toEdit}
                    onClose={() => setToEdit(null)}
                    onSave={onSavedChange}
                />
            )}
        </div>
    );
}
