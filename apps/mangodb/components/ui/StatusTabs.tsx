export type StatusTab<T> = {
    label: string;
    value: T;
    // Shown beside the label when given. '–' while the counts load.
    count?: number | string | undefined;
};

type StatusTabsProps<T> = {
    tabs: readonly StatusTab<T>[];
    value: T;
    onChange: (value: T) => void;
    // Names the group for screen readers, e.g. "Filter proposals by status".
    label: string;
};

// The status filter above a list: one chip per status, the chosen one ringed.
// Built from the Your Proposals chips.
export default function StatusTabs<T>({
    tabs,
    value,
    onChange,
    label,
}: StatusTabsProps<T>) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-3">
            {tabs.map((tab) => {
                const isActive = tab.value === value;
                return (
                    <button
                        key={tab.label}
                        type="button"
                        onClick={() => onChange(tab.value)}
                        aria-pressed={isActive}
                        className={`flex overflow-hidden rounded-button border border-accent type-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                            isActive
                                ? 'ring-2 ring-brand ring-offset-1'
                                : 'hover:brightness-95'
                        }`}
                    >
                        <span className="bg-accent px-3 py-1.5 text-ink">
                            {tab.label}
                        </span>
                        {tab.count !== undefined && (
                            <span className="min-w-9 bg-surface-white px-3 py-1.5 text-ink">
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
