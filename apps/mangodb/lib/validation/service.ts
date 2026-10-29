import { validateCategoryIds } from './listing';

export const SERVICE_FIELDS = {
    listingTitle: 'title',
    listingDesc: 'description',
    categoryIds: 'categoryIds',
    techStack: 'techStack',
    minBudget: 'minBudget',
    maxBudget: 'maxBudget',
} as const;

// A service needs at least one category, and at most the 10 every listing
// allows (the API's listingFields.categoryIds).
export function validateServiceCategory(categoryIds: number[]): string | null {
    if (!categoryIds || categoryIds.length === 0) {
        return 'Select at least one category.';
    }
    return validateCategoryIds(categoryIds);
}

// Digits with an optional decimal part, like "3" or "1.5". Number() alone
// would also take "1e1", "0x2" and ".5".
const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

// Optional. The same rule as a proposal duration (ADR 0007): months in steps
// of 0.5, at most 120.
export function validateServiceDuration(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (!PLAIN_DECIMAL.test(trimmed)) {
        return 'Duration must be a valid number.';
    }
    const duration = Number(trimmed);
    if (duration <= 0) {
        return 'Duration must be greater than zero.';
    }
    if (duration > 120) {
        return 'Duration cannot exceed 120 months.';
    }
    if (!Number.isInteger(duration * 2)) {
        return 'Duration must be in half-month steps (e.g. 0.5, 1, 1.5).';
    }
    return null;
}

export const PREDEFINED_TECH_STACKS = [
    'React',
    'Next.js',
    'TypeScript',
    'Node.js',
    'Python',
    'Tailwind CSS',
    'Vue.js',
    'Flutter',
    'PostgreSQL',
    'Docker',
    'Other',
] as const;

export function validateServiceTechStack(tags: string[]): string | null {
    if (!tags) return null;

    if (tags.length > 20) {
        return 'You can select at most 20 tech stack items.';
    }

    for (const tag of tags) {
        const trimmed = tag.trim();
        if (trimmed.length > 100) {
            return 'Each tech stack name cannot exceed 100 characters.';
        }
    }

    return null;
}
