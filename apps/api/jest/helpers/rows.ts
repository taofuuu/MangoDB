/*
 * Rows the Prisma fake hands back, shaped like the selects in src/lib. Each
 * takes overrides, so a test names only the columns it is about.
 */
import type { CompanyProfileRow } from '../../src/lib/company-profile';

export function companyRow(
    overrides: Partial<CompanyProfileRow> = {},
): CompanyProfileRow {
    return {
        companyId: 1,
        companyName: 'Alpha',
        companyDescription: null,
        username: 'alpha',
        email: 'alpha@mango.test',
        contactEmail: null,
        phone: '0812345678',
        address: null,
        website: null,
        companyPhoto: null,
        accountType: 'PROVIDER',
        companyType: [{ companyType: 'Software' }],
        provider: { serviceTerm: 'Net 30', warrantyPolicy: null },
        ...overrides,
    };
}

export function brief(companyId = 1, companyName = 'Alpha') {
    return { companyId, companyName, companyPhoto: null };
}

// A review's four scores, all the same.
export function scores(n: number) {
    return {
        workQualityScore: n,
        serviceScore: n,
        valueForMoneyScore: n,
        deliveryTimeScore: n,
    };
}

// Nothing reviewed yet: what ratingSelect returns for a new company.
export const NO_RATING = { proposal: [], listing: [] };
