export function SearchServicesEmptyState() {
    return (
        <div className="flex flex-col items-center justify-center gap-1 py-24 text-center">
            <p className="type-lg text-ink">No services found</p>
            <p className="type-sm text-ink-soft">
                Try adjusting or clearing your filters to see more results.
            </p>
        </div>
    );
}
