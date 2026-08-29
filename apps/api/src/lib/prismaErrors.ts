import type { ApiErrorDetail } from './ApiError';

// Prisma's code for "a unique constraint rejected this write".
const UNIQUE_VIOLATION = 'P2002';

type PrismaErrorShape = {
    code?: unknown;
    meta?: {
        target?: unknown;
        driverAdapterError?: {
            cause?: { constraint?: { index?: unknown; fields?: unknown } };
        };
    };
};

function toStringArray(value: unknown): string[] {
    if (typeof value === 'string') {
        return [value];
    }
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

// Duck-typed rather than instanceof: the prisma-client generator does not
// export the error class from the classic @prisma/client path.
function asPrismaError(err: unknown): PrismaErrorShape | null {
    if (typeof err !== 'object' || err === null) {
        return null;
    }
    const candidate = err as PrismaErrorShape;
    return candidate.code === UNIQUE_VIOLATION ? candidate : null;
}

/**
 * The columns a unique constraint rejected, or null if this is some other
 * error. `known` filters out anything that is not a field the caller can name
 * in a validation message — an index over a column the request never sent
 * would only confuse the frontend.
 *
 * Through the driver adapter the columns arrive as the index name
 * (`company_username_key`), not in `meta.target`, which is the plain-engine
 * shape. Both are read here so this keeps working either way.
 */
export function uniqueViolationFields(
    err: unknown,
    known: readonly string[],
): string[] | null {
    const prismaError = asPrismaError(err);
    if (!prismaError) {
        return null;
    }

    const constraint = prismaError.meta?.driverAdapterError?.cause?.constraint;
    const index = constraint?.index;
    const fields = [
        ...toStringArray(prismaError.meta?.target),
        ...toStringArray(constraint?.fields),
        ...(typeof index === 'string' ? [stripIndexName(index)] : []),
    ].filter((field) => known.includes(field));

    return [...new Set(fields)];
}

// company_username_key -> username
function stripIndexName(index: string): string {
    return index.replace(/^[a-z_]+?_/, '').replace(/_key$/, '');
}

// One detail per rejected column, in the shape a form needs.
export function uniqueViolationDetails(
    fields: string[],
    label: (field: string) => string = (field) =>
        `This ${field} is already registered`,
): ApiErrorDetail[] {
    if (fields.length === 0) {
        return [{ field: '(body)', message: 'Already registered' }];
    }
    return fields.map((field) => ({ field, message: label(field) }));
}
