import { monthLabel } from '@/components/sm-detail/MonthDropdown';

// A date column (YYYY-MM-DD, conventions section 10) as "30 Aug 2026".
// Split rather than new Date() — an ISO date parses as UTC midnight and would
// render a day early west of UTC.
export function formatDateOnly(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return `${Number(day)} ${monthLabel(String(Number(month)))} ${year}`;
}
