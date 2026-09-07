import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/ApiError';
import {
    providerServiceSelect,
    toProviderServiceProfile,
} from '../lib/providerProfile';
import { parseBody } from '../middleware/validate';
import {
    addProviderServiceSchema,
    updateProviderServiceSchema,
} from '../schemas/provider.schema';

// Retrieves provider service information, service terms, and warranty policy.
export async function getProviderService(
    req: Request,
    res: Response,
): Promise<void> {
    const companyId = Number(req.auth!.sub);

    const provider = await prisma.provider.findUnique({
        where: { company_id: companyId },
        select: providerServiceSelect,
    });

    if (!provider) {
        throw ApiError.notFound('Provider profile not found');
    }

    res.json(toProviderServiceProfile(provider));
}

// US1-7. Adds service information, conditions, warranty policies, and tech stack.
// Returns 201 Created with the saved profile.
export async function addProviderService(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(addProviderServiceSchema, req.body);
    const companyId = Number(req.auth!.sub);
    const { tech_stack, service_term, warranty_policy } = body;

    // Deduplicate technical stack tags to avoid PK conflict on composite @@id([company_id, tech_stack_name])
    const uniqueTags = tech_stack
        ? Array.from(new Set(tech_stack.map((t) => t.trim())))
        : undefined;

    const provider = await prisma.$transaction(async (tx) => {
        // Ensure company exists
        const company = await tx.company.findUnique({
            where: { company_id: companyId },
            select: { company_id: true },
        });
        if (!company) {
            throw ApiError.notFound('Company not found');
        }

        return tx.provider.upsert({
            where: { company_id: companyId },
            create: {
                company_id: companyId,
                service_term: service_term ?? null,
                warranty_policy: warranty_policy ?? null,
                ...(uniqueTags && {
                    provider_tech_stack: {
                        create: uniqueTags.map((name) => ({
                            tech_stack_name: name,
                        })),
                    },
                }),
            },
            update: {
                ...(service_term !== undefined && { service_term }),
                ...(warranty_policy !== undefined && { warranty_policy }),
                ...(uniqueTags && {
                    provider_tech_stack: {
                        deleteMany: {},
                        create: uniqueTags.map((name) => ({
                            tech_stack_name: name,
                        })),
                    },
                }),
            },
            select: providerServiceSelect,
        });
    });

    res.status(201).json(toProviderServiceProfile(provider));
}

// US1-8. Partial update of service information, service terms, and warranty policy.
// An absent field leaves the column alone; null clears a nullable column.
export async function updateProviderService(
    req: Request,
    res: Response,
): Promise<void> {
    const body = parseBody(updateProviderServiceSchema, req.body);
    const companyId = Number(req.auth!.sub);
    const { tech_stack, service_term, warranty_policy } = body;

    const uniqueTags = tech_stack
        ? Array.from(new Set(tech_stack.map((t) => t.trim())))
        : undefined;

    const provider = await prisma.$transaction(async (tx) => {
        const existing = await tx.provider.findUnique({
            where: { company_id: companyId },
        });
        if (!existing) {
            throw ApiError.notFound('Provider profile not found');
        }

        return tx.provider.update({
            where: { company_id: companyId },
            data: {
                ...(service_term !== undefined && { service_term }),
                ...(warranty_policy !== undefined && { warranty_policy }),
                ...(uniqueTags && {
                    provider_tech_stack: {
                        deleteMany: {},
                        create: uniqueTags.map((name) => ({
                            tech_stack_name: name,
                        })),
                    },
                }),
            },
            select: providerServiceSelect,
        });
    });

    res.json(toProviderServiceProfile(provider));
}
