// One amount as "฿12,500". Fixed en-US grouping, so the number reads the same
// whatever the browser's locale is.
export function formatBaht(value: number): string {
    return `฿${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

// A min/max budget pair as one line of text. Services and jobs both carry one,
// so every card and panel shows the same range the same way.
export function formatBudgetRange(
    minBudget: number | null,
    maxBudget: number | null,
): string {
    if (minBudget == null && maxBudget != null) {
        return `Up to ${formatBaht(maxBudget)}`;
    }
    if (minBudget != null && maxBudget == null) {
        return `From ${formatBaht(minBudget)}`;
    }

    if (minBudget != null && maxBudget != null) {
        return `${formatBaht(minBudget)} – ${formatBaht(maxBudget)}`;
    }

    return 'Contact for pricing';
}
