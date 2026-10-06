import type { CreateProposalRequest, Proposal } from '@mangodb/shared';
import { apiFetch } from '@/lib/api';

// Proposal requests live here rather than in the form, matching the existing
// certificate and portfolio helpers. The caller supplies the selected job
// posting; the API derives the Provider from the signed-in session.
export function createProposal(
    jobPostingId: number,
    body: CreateProposalRequest,
): Promise<Proposal> {
    return apiFetch<Proposal>(`/job-postings/${jobPostingId}/proposals`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}
