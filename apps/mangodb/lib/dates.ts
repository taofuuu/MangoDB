// Month names, kept here rather than in MonthDropdown so lib/ never imports
// from a component (conventions section 13).
export const months = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
];

// The stored value is the month number, so anything rendering a saved date
// needs the label back. One list, both directions.
export function monthLabel(value?: string): string {
    return months.find((month) => month.value === value)?.label ?? '';
}

// A date column (YYYY-MM-DD, conventions section 10) as "30 Aug 2026".
// Split rather than new Date() — an ISO date parses as UTC midnight and would
// render a day early west of UTC.
export function formatDateOnly(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return `${Number(day)} ${monthLabel(String(Number(month)))} ${year}`;
}
