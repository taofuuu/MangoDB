import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import { companyProfileSelect, toCompanyProfile } from '../lib/companyProfile';

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
