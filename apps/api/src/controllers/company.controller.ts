import type { Request, Response } from 'express';
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
    const { company_type, ...columns } = body;

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

    res.json(toCompanyProfile(company));
}
