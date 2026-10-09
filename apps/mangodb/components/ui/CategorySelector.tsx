'use client';

type Category = {
    catId: number;
    catName: string;
};

type CategorySelectorProps = {
    categories: Category[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    error?: string;
};

export default function CategorySelector({
    categories,
    selectedIds,
    onChange,
    error,
}: CategorySelectorProps) {
    function toggleCategory(categoryId: number) {
        const isSelected = selectedIds.includes(categoryId);

        onChange(
            isSelected
                ? selectedIds.filter((id) => id !== categoryId)
                : [...selectedIds, categoryId],
        );
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2 rounded-input border border-brand bg-surface-white/80 p-2">
                {categories.map((category) => {
                    const selected = selectedIds.includes(category.catId);

                    return (
                        <button
                            key={category.catId}
                            type="button"
                            onClick={() => toggleCategory(category.catId)}
                            aria-pressed={selected}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                selected
                                    ? 'border-brand bg-brand text-white'
                                    : 'border-brand bg-surface-white text-ink hover:bg-brand/10'
                            }`}
                        >
                            {category.catName}
                            {selected && ' ✓'}
                        </button>
                    );
                })}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
