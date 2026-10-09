'use client';

import { useState } from 'react';

type Category = {
    catId: number;
    catName: string;
};

type CategorySelectorProps = {
    categories: Category[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    error?: string | undefined;
    className?: string;
};

export default function CategorySelector({
    categories,
    selectedIds,
    onChange,
    error,
    className = '',
}: CategorySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    function toggleCategory(categoryId: number) {
        const isSelected = selectedIds.includes(categoryId);

        onChange(
            isSelected
                ? selectedIds.filter((id) => id !== categoryId)
                : [...selectedIds, categoryId],
        );
    }

    function removeCategory(categoryId: number) {
        onChange(selectedIds.filter((id) => id !== categoryId));
    }

    return (
        <div className={`${className}`}>
            {/* Selector button and selected tags */}
            <div className="relative">
                <div
                    className={`flex min-h-12 flex-wrap items-center gap-2 rounded-input border bg-surface-white/80 p-2 ${
                        isOpen ? 'border-brand' : 'border-brand'
                    }`}
                >
                    {selectedIds.map((id) => {
                        const category = categories.find(
                            (item) => item.catId === id,
                        );

                        if (!category) return null;

                        return (
                            <span
                                key={id}
                                className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 type-sm text-brand"
                            >
                                {category.catName}

                                <button
                                    type="button"
                                    onClick={() => removeCategory(id)}
                                    aria-label={`Remove ${category.catName}`}
                                    className="font-semibold hover:text-danger"
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setIsOpen((open) => !open)}
                        aria-label={
                            isOpen
                                ? 'Close category list'
                                : 'Open category list'
                        }
                        aria-expanded={isOpen}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 type-sm text-brand hover:bg-fill-muted"
                    >
                        <span className="flex h-3 w-3 items-center justify-center type-xl leading-none">
                            {isOpen ? '-' : '+'}
                        </span>
                    </button>
                </div>

                {/* Dropdown list */}
                {isOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-input border border-brand bg-surface-white p-2 shadow-lg">
                        {categories.length === 0 ? (
                            <p className="p-2 text-sm text-ink">
                                No categories available.
                            </p>
                        ) : (
                            categories.map((category) => {
                                const selected = selectedIds.includes(
                                    category.catId,
                                );

                                return (
                                    <label
                                        key={category.catId}
                                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-brand/10"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() =>
                                                toggleCategory(category.catId)
                                            }
                                            className="h-4 w-4 accent-[#497B93]"
                                        />

                                        {category.catName}
                                    </label>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
