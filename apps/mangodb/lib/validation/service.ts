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
