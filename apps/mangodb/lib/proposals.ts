import type {
    CreateProposalRequest,
    Proposal,
    ProposalListResponse,
    ProposalStatus,
} from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { PROPOSAL_PAGE_SIZE } from './pagination';

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

export interface GetMyProposalsOptions {
    status?: ProposalStatus | undefined;
}

// US2-9. Lists proposals submitted by the signed-in Provider.
export function getMyProposals(
    page: number = 1,
    pageSize: number = PROPOSAL_PAGE_SIZE,
    options?: GetMyProposalsOptions,
): Promise<ProposalListResponse> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (options?.status) {
        query.set('status', options.status);
    }

    return apiFetch<ProposalListResponse>(
        `/proposals/mine?${query.toString()}`,
    );
}
