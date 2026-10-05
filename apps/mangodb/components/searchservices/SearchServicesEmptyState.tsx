export function SearchServicesEmptyState() {
    return (
        <div className="flex flex-col items-center justify-center gap-1 py-24 text-center">
            <p className="type-lg text-[var(--color-ink)]">
                404 - Results not found
            </p>
            <p className="type-sm text-[var(--color-ink-soft)]">No Results</p>
        </div>
    );
}
