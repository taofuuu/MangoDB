// Prisma's `contains` becomes SQL LIKE, where % and _ are wildcards: "%"
// alone would match every row. A backslash makes each one a plain character.
export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}
