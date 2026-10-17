export const SERVICE_FIELDS = {
    listingTitle: 'title',
    listingDesc: 'description',
    categoryIds: 'categoryIds',
    techStack: 'techStack',
    minBudget: 'minBudget',
    maxBudget: 'maxBudget',
} as const;

export function validateServiceTitle(value: string | undefined): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Title is required.';
    }
    if (trimmed.length > 255) {
        return 'Title cannot exceed 255 characters.';
    }
    return null;
}

export function validateServiceDescription(
    value: string | undefined,
): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Description is required.';
    }
    if (trimmed.length > 2000) {
        return 'Description cannot exceed 2000 characters.';
    }
    return null;
}

export function validateServiceCategory(categoryIds: number[]): string | null {
    if (!categoryIds || categoryIds.length === 0) {
        return 'Select at least one category.';
    }
    return null;
}

export function validateServiceBudgets(
    minStr: string,
    maxStr: string,
): { minBudget?: string; maxBudget?: string } {
    const errors: { minBudget?: string; maxBudget?: string } = {};

    const min = minStr.trim() !== '' ? Number(minStr) : undefined;
    const max = maxStr.trim() !== '' ? Number(maxStr) : undefined;

    if (min !== undefined) {
        if (isNaN(min) || min < 0) {
            errors.minBudget = 'Min budget cannot be negative.';
        }
    }

    if (max !== undefined) {
        if (isNaN(max) || max <= 0) {
            errors.maxBudget = 'Max budget must be a positive number.';
        }
    }

    if (min !== undefined && max !== undefined && min > max) {
        errors.minBudget = 'Min budget cannot exceed max budget.';
    }

    return errors;
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
