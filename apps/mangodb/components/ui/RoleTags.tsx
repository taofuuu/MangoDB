'use client';

import type { AccountType } from '@mangodb/shared';
import Tag from './Tag';

// Which chips an account type wears. An administrator offers and requests
// nothing, so it wears none — the key still has to be here, because
// Record<AccountType, …> demands every one.
const ROLES: Record<AccountType, readonly string[]> = {
    PROVIDER: ['Provider'],
    RECEIVER: ['Receiver'],
    BOTH: ['Provider', 'Receiver'],
    ADMIN: [],
};

// Terracotta for Provider, blue for Receiver. These were once the other way
// round on the profile side, so the same company read blue on its own page and
// terracotta on the admin list; companies/CompanyCard is what settled it, and
// this file is now the one place that says so.
const ROLE_FILL: Record<string, string> = {
    Provider: 'bg-role-provider text-white',
    Receiver: 'bg-brand-light text-white',
};

type RoleTagsProps = {
    accountType: AccountType;
    // The row. Callers set their own gap.
    className?: string;
    // Each chip. Tag's own size is the profile panel's; a card wants smaller.
    tagClassName?: string;
};

export default function RoleTags({
    accountType,
    className = '',
    tagClassName = '',
}: RoleTagsProps) {
    const roles = ROLES[accountType];

    if (roles.length === 0) {
        return null;
    }

    return (
        <div className={`flex ${className}`}>
            {roles.map((role) => (
                <Tag
                    key={role}
                    label={role}
                    className={`${tagClassName} ${ROLE_FILL[role]}`}
                />
            ))}
        </div>
    );
}
