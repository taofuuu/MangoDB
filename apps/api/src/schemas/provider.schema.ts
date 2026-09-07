import { z } from 'zod';

export const providerServiceFields = {
    service_term: z.string().trim().min(1).max(5000),
    warranty_policy: z.string().trim().min(1).max(5000),
    // Technical stack tags (e.g. React, Node.js, PostgreSQL). Each max 100 to match DB column.
    tech_stack: z.array(z.string().trim().min(1).max(100)).max(20),
} as const;

// US1-7. Adding service information and service terms.
export const addProviderServiceSchema = z
    .object({
        service_term: providerServiceFields.service_term.nullable().optional(),
        warranty_policy: providerServiceFields.warranty_policy
            .nullable()
            .optional(),
        tech_stack: providerServiceFields.tech_stack.optional(),
    })
    .refine(
        (body) =>
            body.service_term !== undefined ||
            body.warranty_policy !== undefined ||
            body.tech_stack !== undefined,
        {
            message:
                'Provide at least one of service_term, warranty_policy, or tech_stack',
        },
    );

export type AddProviderServiceInput = z.infer<typeof addProviderServiceSchema>;

// US1-8. Editing service information and service terms.
// An absent field leaves the column alone; null clears a nullable column.
export const updateProviderServiceSchema = z
    .object({
        service_term: providerServiceFields.service_term.nullable().optional(),
        warranty_policy: providerServiceFields.warranty_policy
            .nullable()
            .optional(),
        tech_stack: providerServiceFields.tech_stack.optional(),
    })
    // An empty body is a client bug, not a no-op worth a 200.
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type UpdateProviderServiceInput = z.infer<
    typeof updateProviderServiceSchema
>;
