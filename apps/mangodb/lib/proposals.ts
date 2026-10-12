import type {
    CreateProposalRequest,
    Proposal,
    ProposalListResponse,
    ProposalStatus,
} from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { cachedGet, invalidateAfter } from '@/lib/apiCache';
import { PROPOSAL_PAGE_SIZE } from './pagination';

// Proposal requests live here rather than in the form, matching the existing
// certificate and portfolio helpers. The caller supplies the selected job
// posting; the API derives the Provider from the signed-in session.
export function createProposal(
    jobPostingId: number,
    body: CreateProposalRequest,
): Promise<Proposal> {
    // written under time-crunch bypass — review later
    // A new proposal changes /proposals/mine. Job postings carry no proposal
    // data, so nothing else needs clearing.
    return invalidateAfter(
        apiFetch<Proposal>(`/job-postings/${jobPostingId}/proposals`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/proposals',
    );
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

    const path = `/proposals/mine?${query.toString()}`;
    return cachedGet(path, () => apiFetch<ProposalListResponse>(path));
}
