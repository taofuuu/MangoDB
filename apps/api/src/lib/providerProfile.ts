import type { ProviderServiceProfile } from '@mangodb/shared';

// The columns the provider service endpoints return.
export const providerServiceSelect = {
    company_id: true,
    service_term: true,
    warranty_policy: true,
    provider_tech_stack: { select: { tech_stack_name: true } },
} as const;

export interface ProviderServiceRow {
    company_id: number;
    service_term: string | null;
    warranty_policy: string | null;
    provider_tech_stack: { tech_stack_name: string }[];
}

// Flattens the provider_tech_stack join rows to plain string array.
export function toProviderServiceProfile(
    row: ProviderServiceRow,
): ProviderServiceProfile {
    return {
        company_id: row.company_id,
        service_term: row.service_term,
        warranty_policy: row.warranty_policy,
        tech_stack: row.provider_tech_stack.map((item) => item.tech_stack_name),
    };
}
