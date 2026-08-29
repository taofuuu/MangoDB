import type { AccountType, UserRole } from '@mangodb/shared';

// account_type is what the company signed up as; role is what its token says.
// The two are the same idea in different cases, except BOTH.
const ROLE_BY_ACCOUNT_TYPE: Record<AccountType, UserRole> = {
    PROVIDER: 'provider',
    RECEIVER: 'receiver',
    BOTH: 'both',
};

export function accountTypeToRole(accountType: AccountType): UserRole {
    return ROLE_BY_ACCOUNT_TYPE[accountType];
}

// What each role may act as. A BOTH company offers and requests work, so it
// satisfies a provider-only and a receiver-only route. Admin grants only admin:
// it is not a superset.
const GRANTS: Record<UserRole, readonly UserRole[]> = {
    provider: ['provider'],
    receiver: ['receiver'],
    both: ['provider', 'receiver', 'both'],
    admin: ['admin'],
};

export function roleGrants(role: UserRole): readonly UserRole[] {
    return GRANTS[role];
}
