import type { Request, Response } from 'express';
import { roleGrants } from '../auth/roles';
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
import { parseBody } from '../middleware/validate';
import {
    COMPANY_UNIQUE_FIELDS,
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

    // Reports both collisions at once; an index only fails on the first. The
    // caller's own row is excluded, or resubmitting your own email would 409.
    await assertCompanyIdentityAvailable(
        { username: columns.username, email: columns.email },
        companyId,
    );

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
        // Another company can take the name between the check and the write;
        // the indexes are what actually enforce uniqueness.
        const fields = uniqueViolationFields(err, COMPANY_UNIQUE_FIELDS);
        if (fields) {
            throw ApiError.conflict(
                'Username or email already registered',
                uniqueViolationDetails(fields),
            );
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
