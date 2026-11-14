import type {
    CreateProposalRequest,
    Paginated,
    Project,
    Proposal,
    ProposalStatus,
    ProposalStatusCounts,
    ReceivedProposal,
    SentProposal,
} from '@mangodb/shared';
import { apiFetch } from '@/lib/api';
import { cachedGet, invalidateAfter } from '@/lib/apiCache';
import { PROPOSAL_PAGE_SIZE } from './pagination';

// Proposal requests live here rather than in the form, matching the existing
// certificate and portfolio helpers. The caller supplies the selected job
// posting; the API derives the Provider from the signed-in session.
export function createProposal(
    jobId: number,
    body: CreateProposalRequest,
): Promise<Proposal> {
    // A new proposal changes /proposals/mine. Job postings carry no proposal
    // data, so nothing else needs clearing.
    return invalidateAfter(
        apiFetch<Proposal>(`/jobs/${jobId}/proposals`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/proposals',
    );
}

// US2-15. A hire request is a proposal on a service, sent by a Receiver. The
// API answers with the same Proposal shape and the same /proposals/mine list.
export function createHireRequest(
    serviceId: number,
    body: CreateProposalRequest,
): Promise<Proposal> {
    return invalidateAfter(
        apiFetch<Proposal>(`/services/${serviceId}/proposals`, {
            method: 'POST',
            body: JSON.stringify(body),
        }),
        '/proposals',
    );
}

// US2-10. The proposals sent to one of the caller's jobs.
export function listJobProposals(jobId: number): Promise<ReceivedProposal[]> {
    const path = `/jobs/${jobId}/proposals`;
    return cachedGet(path, () => apiFetch<ReceivedProposal[]>(path));
}

// US2-16. The proposals sent to one of the caller's services (hire requests).
export function listServiceProposals(
    serviceId: number,
): Promise<ReceivedProposal[]> {
    const path = `/services/${serviceId}/proposals`;
    return cachedGet(path, () => apiFetch<ReceivedProposal[]>(path));
}

// POST /proposals/:proposalId/accept. Accepting closes the job and rejects the
// other proposals, so the job lists and every proposal list are stale after it.
export function acceptProposal(proposalId: number): Promise<Project> {
    return invalidateAfter(
        apiFetch<Project>(`/proposals/${proposalId}/accept`, {
            method: 'POST',
        }),
        '/jobs',
        '/proposals',
        '/services',
        '/projects',
    );
}

// POST /proposals/:proposalId/reject. Only that proposal changes, but it is
// shown in the job's proposal list and in its sender's.
export function rejectProposal(proposalId: number): Promise<void> {
    return invalidateAfter(
        apiFetch<void>(`/proposals/${proposalId}/reject`, {
            method: 'POST',
        }),
        '/jobs',
        '/proposals',
        '/services',
    );
}
export interface GetMyProposalsOptions {
    status?: ProposalStatus | undefined;
}

// US2-9. Lists proposals or hire requests submitted by the signed-in company.
export function listMyProposals(
    page: number = 1,
    pageSize: number = PROPOSAL_PAGE_SIZE,
    options?: GetMyProposalsOptions,
): Promise<Paginated<SentProposal>> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });

    if (options?.status) {
        query.set('status', options.status);
    }

    const path = `/proposals/mine?${query.toString()}`;
    return cachedGet(path, () => apiFetch<Paginated<SentProposal>>(path));
}

// US2-9. The numbers on the Your Proposals chips. createProposal's
// invalidateAfter('/proposals') clears this too, so a new proposal shows up.
export function getMyProposalCounts(): Promise<ProposalStatusCounts> {
    const path = '/proposals/mine/counts';
    return cachedGet(path, () => apiFetch<ProposalStatusCounts>(path));
}
