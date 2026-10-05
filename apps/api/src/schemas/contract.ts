// Zod is what actually enforces a request body. `packages/shared` is what the
// frontend writes against. Nothing made the two agree — four of the shared
// request types were imported by no file in this app at all, so a schema could
// drift from its contract and both sides would still compile.
//
// This file is that check. It exports nothing and runs nothing: the assertions
// are types, so `tsc` fails here if a schema and its shared type disagree about
// a field name, a type, or which fields are optional.
//
// With no test runner in this project, this is the cheapest real safety
// available. Add a line here whenever a request body gets a shared type.

import type { z } from 'zod';
import type {
    ChangeCredentialsRequest,
    CreateJobPostingRequest,
    CreateProposalRequest,
    DeleteCompanyAccountRequest,
    RegisterRequest,
    UpdateCompanyProfileRequest,
    UpdateJobPostingRequest,
} from '@mangodb/shared';
import type { registerSchema } from './auth.schema';
import type {
    changeCredentialsSchema,
    updateCompanyProfileSchema,
} from './company.schema';
import type { deleteCompanyAccountBodySchema } from './admin-company.schema';
import type {
    createJobPostingSchema,
    updateJobPostingSchema,
} from './job-posting.schema';
import type { createProposalSchema } from './proposal.schema';

// Fails to compile unless T is assignable to U. Both directions are asserted
// below, so neither side may carry a field the other does not.
type Assert<T extends U, U> = T;

type RegisterInput = z.infer<typeof registerSchema>;
type _RegisterMatchesContract = Assert<RegisterInput, RegisterRequest>;
type _ContractMatchesRegister = Assert<RegisterRequest, RegisterInput>;

type UpdateProfileInput = z.infer<typeof updateCompanyProfileSchema>;
type _UpdateProfileMatchesContract = Assert<
    UpdateProfileInput,
    UpdateCompanyProfileRequest
>;
type _ContractMatchesUpdateProfile = Assert<
    UpdateCompanyProfileRequest,
    UpdateProfileInput
>;

type ChangeCredentialsInput = z.infer<typeof changeCredentialsSchema>;
type _CredentialsMatchContract = Assert<
    ChangeCredentialsInput,
    ChangeCredentialsRequest
>;
type _ContractMatchesCredentials = Assert<
    ChangeCredentialsRequest,
    ChangeCredentialsInput
>;

type DeleteAccountInput = z.infer<typeof deleteCompanyAccountBodySchema>;
type _DeleteAccountMatchesContract = Assert<
    DeleteAccountInput,
    DeleteCompanyAccountRequest
>;
type _ContractMatchesDeleteAccount = Assert<
    DeleteCompanyAccountRequest,
    DeleteAccountInput
>;

type CreateJobPostingInput = z.infer<typeof createJobPostingSchema>;
type _CreateJobPostingMatchesContract = Assert<
    CreateJobPostingInput,
    CreateJobPostingRequest
>;
type _ContractMatchesCreateJobPosting = Assert<
    CreateJobPostingRequest,
    CreateJobPostingInput
>;

type UpdateJobPostingInput = z.infer<typeof updateJobPostingSchema>;
type _UpdateJobPostingMatchesContract = Assert<
    UpdateJobPostingInput,
    UpdateJobPostingRequest
>;
type _ContractMatchesUpdateJobPosting = Assert<
    UpdateJobPostingRequest,
    UpdateJobPostingInput
>;

type CreateProposalInput = z.infer<typeof createProposalSchema>;
type _CreateProposalMatchesContract = Assert<
    CreateProposalInput,
    CreateProposalRequest
>;
type _ContractMatchesCreateProposal = Assert<
    CreateProposalRequest,
    CreateProposalInput
>;
