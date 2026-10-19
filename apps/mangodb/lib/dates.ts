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

// A stored month number and year as "May 2024". Either part can be missing on
// a certificate, so it keeps whatever was filled in ('' when neither was).
export function formatMonthYear(
    month?: number | string | null,
    year?: number | string | null,
): string {
    return [monthLabel(month?.toString()), year].filter(Boolean).join(' ');
}

// "30 Aug 2026". Built by hand rather than with toLocaleDateString, whose
// order and month names change with the browser's locale.
function dayMonthYear(year: number, month: number, day: number): string {
    return `${day} ${monthLabel(String(month)).slice(0, 3)} ${year}`;
}

// A date column (YYYY-MM-DD, conventions section 10) as "30 Aug 2026".
// Split rather than new Date(): an ISO date parses as UTC midnight, which is
// still the day before for a viewer west of UTC.
export function formatDateOnly(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return dayMonthYear(Number(year), Number(month), Number(day));
}

// A timestamp (createdAt) as "30 Aug 2026", on the viewer's own calendar.
export function formatDate(iso: string): string {
    const date = new Date(iso);
    return dayMonthYear(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
    );
}

// A timestamp as "dd/mm/yyyy hh:mm" in the viewer's local time, for the
// proposal cards that show when it was sent.
export function formatDateTime(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

// A proposal's duration, which is stored in months (conventions section 8).
export function formatMonths(count: number): string {
    return `${count} ${count === 1 ? 'month' : 'months'}`;
}
