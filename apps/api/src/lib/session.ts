import type { CompanyProfile, SessionResponse } from '@mangodb/shared';
import { signAccessToken } from '../auth/jwt';
import { accountTypeToRole } from '../auth/roles';

// Register, login, and a credential change all hand back a company and a token
// to act as it. One place decides what that pair looks like, so the three
// cannot drift on the claims they mint.
export function issueSession(company: CompanyProfile): SessionResponse {
    const accessToken = signAccessToken({
        sub: String(company.company_id),
        role: accountTypeToRole(company.account_type),
    });

    return { company, accessToken };
}
