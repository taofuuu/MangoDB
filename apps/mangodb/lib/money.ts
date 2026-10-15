// A min/max budget pair as one line of text. Services and job postings both
// carry one, so every card and panel shows the same range the same way.
export function formatBudgetRange(
    minBudget: number | null,
    maxBudget: number | null,
): string {
    const format = (value: number) => `฿${value.toLocaleString('en-US')}`;

    if (minBudget == null && maxBudget != null) {
        return `Up to ${format(maxBudget)}`;
    }
    if (minBudget != null && maxBudget == null) {
        return `From ${format(minBudget)}`;
    }

    if (minBudget != null && maxBudget != null) {
        return `${format(minBudget)} – ${format(maxBudget)}`;
    }

    return 'Contact for pricing';
}
