'use client';

// A date picked with three selects. The parts stay text, as <select> gives
// them.
export type DateParts = { year: string; month: string; day: string };

// 31 until both a month and a year are picked.
export function daysInMonth(year: string, month: string): number {
    const numericYear = Number(year);
    const numericMonth = Number(month);

    return numericYear > 0 && numericMonth > 0
        ? new Date(numericYear, numericMonth, 0).getDate()
        : 31;
}

// 1, 2, …, count.
const numbersUpTo = (count: number) =>
    Array.from({ length: count }, (_, index) => index + 1);

type DevelopmentDateFieldsProps = {
    value: DateParts;
    onChange: (value: DateParts) => void;
    minYear: number;
    maxYear: number;
};

const selectClassName =
    'h-[4.89vh] w-full rounded-input border border-brand-dark bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand';

// The day, month and year selects of the portfolio form. A new month or year
// keeps the day unless that month is shorter, so 31 March becomes 30 April.
export default function DevelopmentDateFields({
    value,
    onChange,
    minYear,
    maxYear,
}: DevelopmentDateFieldsProps) {
    const days = numbersUpTo(daysInMonth(value.year, value.month));
    const years = Array.from(
        { length: maxYear - minYear + 1 },
        (_, index) => maxYear - index,
    );

    const changeMonthOrYear = (year: string, month: string) => {
        const lastDay = daysInMonth(year, month);
        onChange({
            year,
            month,
            day: String(Math.min(Number(value.day), lastDay)),
        });
    };

    return (
        <div className="flex gap-2 max-sm:flex-col">
            <label className="min-w-0 flex-1 type-sm">
                Date
                <select
                    value={value.day}
                    onChange={(event) =>
                        onChange({ ...value, day: event.target.value })
                    }
                    className={selectClassName}
                >
                    {days.map((day) => (
                        <option key={day} value={day}>
                            {day}
                        </option>
                    ))}
                </select>
            </label>
            <label className="min-w-0 flex-1 type-sm">
                Month
                <select
                    value={value.month}
                    onChange={(event) =>
                        changeMonthOrYear(value.year, event.target.value)
                    }
                    className={selectClassName}
                >
                    {numbersUpTo(12).map((month) => (
                        <option key={month} value={month}>
                            {month}
                        </option>
                    ))}
                </select>
            </label>
            <label className="min-w-0 flex-1 type-sm">
                Year
                <select
                    value={value.year}
                    onChange={(event) =>
                        changeMonthOrYear(event.target.value, value.month)
                    }
                    className={selectClassName}
                >
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}
