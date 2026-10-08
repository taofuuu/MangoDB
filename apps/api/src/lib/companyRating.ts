export const companyRatingSelect = {
    proposal: {
        select: {
            project: {
                select: {
                    rating: { select: { ratingScore: true } },
                },
            },
        },
    },
} as const;

export interface CompanyRatingSource {
    proposal: {
        project: {
            rating: { ratingScore: unknown }[];
        } | null;
    }[];
}

export function getCompanyRating(source: CompanyRatingSource): {
    averageRating: number | null;
    ratingCount: number;
} {
    const scores = source.proposal.flatMap(
        ({ project }) =>
            project?.rating.map(({ ratingScore }) => Number(ratingScore)) ?? [],
    );

    if (scores.length === 0) {
        return { averageRating: null, ratingCount: 0 };
    }

    const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
        averageRating: Math.round(average * 10) / 10,
        ratingCount: scores.length,
    };
}
