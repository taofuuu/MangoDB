import { parseParams } from '../middleware/validate';
import { proposalIdParamSchema } from '../schemas/proposal.schema';
import type { Request, Response } from 'express';
import { acceptProposal, rejectProposal } from '../lib/proposal';
export async function acceptProposalHandler(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);
    const project = await acceptProposal(proposalId, callerId);
    res.status(201).json(project);
}
export async function rejectProposalHandler(
    req: Request,
    res: Response,
): Promise<void> {
    const callerId = req.auth!.companyId;
    const { proposalId } = parseParams(proposalIdParamSchema, req.params);
    await rejectProposal(proposalId, callerId);
    res.status(204).end();
}
