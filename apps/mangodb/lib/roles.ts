// The browser's half of apps/api/src/auth/roles.ts, where the same rule is
// `ownsProviderRow` / `ownsReceiverRow`. A BOTH company offers and requests
// work, so it counts as each of them; an ADMIN counts as neither.
//
// It was written out as `x === 'PROVIDER' || x === 'BOTH'` in five files. That
// is the kind of line that gets a new account type added to four of them.
//
// Typed as string rather than AccountType: accountType is a VarChar column on
// the API side, so a value no signup path produces can still reach the
// browser, and answering false for it is the safe way to be wrong.
export function isProviderAccount(accountType: string): boolean {
    return accountType === 'PROVIDER' || accountType === 'BOTH';
}

export function isReceiverAccount(accountType: string): boolean {
    return accountType === 'RECEIVER' || accountType === 'BOTH';
}

export function isCompanyAccount(accountType: string): boolean {
    return isProviderAccount(accountType) || isReceiverAccount(accountType);
}

export type ListingTab = 'services' | 'jobs';

// The listing tabs on a profile's ServicesSection, your own or another
// company's. Services is the tab you offer as a provider and Job Listing the
// one you post as a receiver, so a PROVIDER-only company gets Services alone
// and a BOTH company gets the two.
export function profileListingTabs(accountType: string): ListingTab[] {
    const tabs: ListingTab[] = [];
    if (isProviderAccount(accountType)) tabs.push('services');
    if (isReceiverAccount(accountType)) tabs.push('jobs');
    return tabs;
}
