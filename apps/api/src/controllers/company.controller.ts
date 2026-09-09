import type { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../auth/password';
import { roleGrants } from '../auth/roles';
import { revokeToken } from '../auth/tokenDenylist';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { companyProfileSelect, toCompanyProfile } from '../lib/companyProfile';
import { assertCompanyIdentityAvailable } from '../lib/companyIdentity';
import { omitUndefined } from '../lib/objects';
import {
    isRecordNotFound,
    uniqueViolationDetails,
    uniqueViolationFields,
} from '../lib/prismaErrors';
import { issueSession } from '../lib/session';
import { parseBody } from '../middleware/validate';
import {
    COMPANY_UNIQUE_FIELDS,
    changeCredentialsSchema,
    updateCompanyProfileSchema,
} from '../schemas/company.schema';

// US1-4. Read fresh, not echoed from the claims: an edit in another session
// has to show up here.
export async function getMyProfile(req: Request, res: Response): Promise<void> {
    // sub is a string in the token; company_id is an int.
    const company = await prisma.company.findUnique({
        where: { company_id: Number(req.auth!.sub) },
        select: companyProfileSelect,
    });

    // Token verified, so the row existed once — a company deleted mid-session.
    if (!company) {
        throw ApiError.notFound('Company not found');
    }

    res.json(toCompanyProfile(company));
}

// US1-5. Partial by design: an absent field leaves its column alone, and null
// clears one that is nullable. Answers with the whole profile, in the shape
// getMyProfile returns, so the form can render the saved state without a
// second request.
export async function updateMyProfile(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(updateCompanyProfileSchema, req.body);
    const companyId = Number(req.auth!.sub);
    const { company_type, service_term, warranty_policy, ...columns } = body;

    // `in`, not a truthiness check: zod drops absent keys, so this is the one
    // way to tell "left alone" from an explicit null that means "clear it".
    const editsProvider = 'service_term' in body || 'warranty_policy' in body;

    // roleGrants rather than role === 'provider': a BOTH company is a provider
    // too, and owns the row these columns live on.
    if (editsProvider && !roleGrants(req.auth!.role).includes('provider')) {
        throw ApiError.forbidden(
            'Only a provider company has service terms and a warranty policy',
        );
    }

    let company;
    try {
        company = await prisma.company.update({
            where: { company_id: companyId },
            data: {
                ...omitUndefined(columns),
                // Tags are a set, not a list to append to: the request carries
                // the whole set, so the rows it replaces go. A nested write is
                // one transaction, so the company is never left untagged.
                ...(company_type && {
                    company_type: {
                        deleteMany: {},
                        create: company_type.map((tag) => ({
                            company_type: tag,
                        })),
                    },
                }),
                // A second table, same transaction. omitUndefined keeps a body
                // that sent only one of the two from clearing the other.
                ...(editsProvider && {
                    provider: {
                        update: omitUndefined({
                            service_term,
                            warranty_policy,
                        }),
                    },
                }),
            },
            select: companyProfileSelect,
        });
    } catch (err) {
        // Only one unique constraint is still reachable from here: company_type
        // is keyed on (company_id, company_type), so a tag repeated inside one
        // request collides with itself. Username and email moved to
        // changeMyCredentials, and nothing else this writes is unique.
        if (uniqueViolationFields(err, COMPANY_UNIQUE_FIELDS)) {
            throw ApiError.conflict('Company types must not repeat', [
                { field: 'company_type', message: 'Remove the duplicate tag' },
            ]);
        }
        // Also fires if a provider company somehow has no provider row, but
        // register creates one with the company and nothing removes it, so
        // that would be broken data rather than a case to handle here.
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Company not found');
        }
        throw err;
    }

    res.json(toCompanyProfile(company));
}

// The three fields a company signs in with. Each of them is a way to take the
// account over — move the email and you own the login, change the password and
// the owner is locked out — so all three sit behind the current password rather
// than behind a token alone. Answers with a company and a fresh token, because
// it revokes the one it was called with.
export async function changeMyCredentials(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(changeCredentialsSchema, req.body);
    const companyId = Number(req.auth!.sub);
    const { current_password, new_password, ...identity } = body;

    // companyProfileSelect leaves the hash out on purpose, and the check needs
    // it — ask for it on its own, then never let it past this function.
    const existing = await prisma.company.findUnique({
        where: { company_id: companyId },
        select: { password: true },
    });

    // Token verified, so the row existed once — a company deleted mid-session.
    if (!existing) {
        throw ApiError.notFound('Company not found');
    }

    // No dummy-hash dance here, unlike login: the caller is already
    // authenticated, so there is no account to enumerate by timing this.
    if (!(await verifyPassword(current_password, existing.password))) {
        throw ApiError.unauthorized('Current password is incorrect');
    }

    // Reports both collisions at once; an index only fails on the first. The
    // caller's own row is excluded, or resubmitting your own email would 409.
    await assertCompanyIdentityAvailable(identity, companyId);

    let company;
    try {
        company = await prisma.company.update({
            where: { company_id: companyId },
            data: {
                ...omitUndefined(identity),
                // Hashed on the way in. The plaintext reaches nothing else.
                ...(new_password
                    ? { password: await hashPassword(new_password) }
                    : {}),
            },
            select: companyProfileSelect,
        });
    } catch (err) {
        // Another company can take the name between the check and the write;
        // the indexes are what actually enforce uniqueness.
        const fields = uniqueViolationFields(err, COMPANY_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'Username or email already registered',
                uniqueViolationDetails(fields),
            );
        }
        if (isRecordNotFound(err)) {
            throw ApiError.notFound('Company not found');
        }
        throw err;
    }

    // After the write, never before: a wrong password or a 409 must not cost
    // the caller its session. Revoking the presented jti is the only revocation
    // this codebase can do — there is no per-company token version — so it ends
    // any copy of this token and nothing else.
    await revokeToken(req.auth!.jti, req.auth!.exp);

    res.json(issueSession(toCompanyProfile(company)));
}
