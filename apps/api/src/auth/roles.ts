import type { AccountType, UserRole } from '@mangodb/shared';

// account_type is what the company signed up as; role is what its token says.
// The two are the same idea in different cases, except BOTH.
const ROLE_BY_ACCOUNT_TYPE: Record<AccountType, UserRole> = {
    PROVIDER: 'provider',
    RECEIVER: 'receiver',
    BOTH: 'both',
};

// account_type is a VarChar column, not a real Postgres enum (see
// CompanyProfileRow), so nothing stops a bad value from reaching here except
// registerSchema — and only for rows register itself wrote. A row from
// anywhere else (a seed script, a manual edit, a future bulk-import path)
// isn't covered. Throwing turns a silent undefined-role token into a 500
// instead of a broken login that still succeeds.
export function accountTypeToRole(accountType: AccountType): UserRole {
    const role = ROLE_BY_ACCOUNT_TYPE[accountType];
    if (!role) {
        throw new Error(`Unknown account_type: ${accountType}`);
    }
    return role;
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
