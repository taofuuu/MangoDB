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

// US2-9. How many proposals the Provider has sent, by status: the numbers on
// the page's chips. They must not change when the list is filtered.
export interface ProposalStatusCounts {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
}

// The list endpoint already counts the matches for a filter in
// pagination.totalItems, so one 1-item page per status gives each number.
// This keeps GET /proposals/mine to the plain { items, pagination } shape
// (docs/conventions.md §3). `list` is a parameter only so tests can fake it.
export async function getMyProposalCounts(
    list: typeof listMyProposals = listMyProposals,
): Promise<ProposalStatusCounts> {
    const [all, pending, accepted, rejected] = await Promise.all([
        list(1, 1),
        list(1, 1, { status: 'PENDING' }),
        list(1, 1, { status: 'ACCEPTED' }),
        list(1, 1, { status: 'REJECTED' }),
    ]);

    return {
        total: all.pagination.totalItems,
        pending: pending.pagination.totalItems,
        accepted: accepted.pagination.totalItems,
        rejected: rejected.pagination.totalItems,
    };
}
