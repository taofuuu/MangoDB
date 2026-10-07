import type {
    CreateProposalRequest,
    PostingProposal,
    Project,
    Proposal,
} from '@mangodb/shared';
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

// US2-10. Fetch submitted proposals for a given job posting listing ID
export function getSubmittedProposals(
    jobPostingId: number,
): Promise<PostingProposal[]> {
    return apiFetch<PostingProposal[]>(
        `/job-postings/${jobPostingId}/proposals`,
        {
            method: 'GET',
        },
    );
}

// Accept a proposal (POST /proposals/:proposalId/accept)
export function acceptProposal(proposalId: number): Promise<Project> {
    return apiFetch<Project>(`/proposals/${proposalId}/accept`, {
        method: 'POST',
    });
}

// Reject a proposal (POST /proposals/:proposalId/reject)
export function rejectProposal(proposalId: number): Promise<void> {
    return apiFetch<void>(`/proposals/${proposalId}/reject`, {
        method: 'POST',
    });
}
