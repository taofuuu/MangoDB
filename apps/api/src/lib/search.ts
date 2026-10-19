// Prisma's `contains` becomes SQL LIKE, where % and _ are wildcards: "%"
// alone would match every row. A backslash makes each one a plain character.
export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}

// A keyword split into words, each matched on its own, so "react payment"
// finds a row that says each one somewhere. Blank or missing means no words.
export function splitWords(q: string | undefined): string[] {
    return q?.split(/\s+/).filter(Boolean) ?? [];
}

// One word as a case-insensitive, plain-text `contains`.
export function containsWord(word: string) {
    return { contains: escapeLike(word), mode: 'insensitive' } as const;
}
