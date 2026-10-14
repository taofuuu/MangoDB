import type {
    CreateProposalRequest,
    Proposal,
    ProposalListResponse,
    ProposalStatus,
    ProposalStatusCounts,
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
export function listMyProposals(
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

// The "dd/mm/yyyy hh:mm" stamp on a proposal card, in the viewer's local time.
// Built by hand rather than with toLocaleString, whose order and separators
// change with the browser's locale.
export function formatProposalDateTime(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

// US2-9. The numbers on the Your Proposals chips. createProposal's
// invalidateAfter('/proposals') clears this too, so a new proposal shows up.
export function getMyProposalCounts(): Promise<ProposalStatusCounts> {
    const path = '/proposals/mine/counts';
    return cachedGet(path, () => apiFetch<ProposalStatusCounts>(path));
}
