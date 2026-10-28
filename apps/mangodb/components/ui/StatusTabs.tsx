export type StatusTab<T> = {
    label: string;
    value: T;
    // Shown beside the label when given. '–' while the counts load.
    count?: number | string | undefined;
    // pills only: the chosen pill's colours, e.g. 'bg-brand text-surface-white'.
    activeClass?: string | undefined;
    className?: string | undefined;
};

type StatusTabsProps<T> = {
    tabs: readonly StatusTab<T>[];
    value: T;
    onChange: (value: T) => void;
    // Names the group for screen readers, e.g. "Filter proposals by status".
    label: string;
    // chips: a yellow label with its count, the chosen one ringed (Your
    // Proposals, received proposals). pills: a white pill per status that
    // fills with its own activeClass when chosen (My Jobs).
    variant?: 'chips' | 'pills';
    className?: string | undefined;
};

// The status filter above a list. Built from the Your Proposals chips and the
// My Jobs pills.
export default function StatusTabs<T>({
    tabs,
    value,
    onChange,
    label,
    variant = 'chips',
    className,
}: StatusTabsProps<T>) {
    if (variant === 'pills') {
        return (
            <div
                role="group"
                aria-label={label}
                className={`flex items-center gap-[0.63vw] ${className ?? ''}`}
            >
                {tabs.map((tab) => {
                    const isActive = tab.value === value;
                    const isClickable = tab.value !== null;
                    return (
                        <button
                            key={tab.label}
                            type="button"
                            onClick={() => {
                                if (isClickable) onChange(tab.value);
                            }}
                            aria-pressed={isActive}
                            className={`flex h-[4.17vh] w-[6.77vw] items-center justify-center rounded-full border type-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                                isActive
                                    ? `${tab.activeClass ?? 'bg-accent text-surface-white'} border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.18),0_3px_6px_rgba(0,0,0,0.18)]`
                                    : 'border-line bg-surface-white text-ink shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_2px_5px_rgba(0,0,0,0.12)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_3px_7px_rgba(0,0,0,0.16)]'
                            } ${tab.className ?? ''}`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div
            role="group"
            aria-label={label}
            className={`flex w-full flex-wrap items-center gap-3 ${className ?? ''}`}
        >
            {tabs.map((tab) => {
                const isActive = tab.value === value;
                const isClickable = tab.value !== null;
                return (
                    <button
                        key={tab.label}
                        type="button"
                        onClick={() => {
                            if (isClickable) onChange(tab.value);
                        }}
                        aria-pressed={isActive}
                        className={`flex overflow-hidden rounded-button border border-accent type-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                            isActive
                                ? 'ring-2 ring-brand ring-offset-1'
                                : isClickable
                                  ? 'hover:brightness-95 cursor-pointer'
                                  : 'cursor-default pointer-events-none'
                        } ${tab.className ?? ''}`}
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
