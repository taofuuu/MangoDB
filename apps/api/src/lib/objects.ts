// exactOptionalPropertyTypes is on, and Prisma's update inputs declare their
// columns as `name?: string` — no `| undefined`. A zod .partial() infers
// `name?: string | undefined`, which TypeScript will not hand over, so a PATCH
// body has to lose its undefined keys before it can become an update.
export function omitUndefined<T extends object>(
    value: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
    return Object.fromEntries(
        Object.entries(value).filter(([, v]) => v !== undefined),
    ) as { [K in keyof T]?: Exclude<T[K], undefined> };
}
