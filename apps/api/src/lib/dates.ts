// A @db.Date column holds a day, not a moment (conventions §10). On the wire
// it is YYYY-MM-DD; in Prisma it is a Date at UTC midnight. These two turn one
// into the other, so no handler has to remember which half is UTC.

// YYYY-MM-DD to the Date the column stores.
export function fromDateOnly(day: string): Date {
    return new Date(`${day}T00:00:00Z`);
}

// The column's Date back to YYYY-MM-DD. It comes back at UTC midnight, so
// slicing the ISO string drifts no day.
export function toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}
