// Zod is what actually enforces a request body. `packages/shared` is what the
// frontend writes against. Nothing made the two agree — four of the shared
// request types were imported by no file in this app at all, so a schema could
// drift from its contract and both sides would still compile.
//
// This file is that check. It exports nothing and runs nothing: the assertions
// are types, so `tsc` fails here if a schema and its shared type disagree about
// a field name, a type, or which fields are optional.
//
// The unit tests check what a handler does; only this checks that the two
// sides agree on the shape. Add a line here whenever a request body gets a
// shared type.

import type { z } from 'zod';
import type {
    ChangeCredentialsRequest,
    CreateJobRequest,
    CreateProjectUpdateRequest,
    CreateProposalRequest,
    CreateServiceRequest,
    DeleteCompanyAccountRequest,
    RegisterRequest,
    UpdateCompanyProfileRequest,
    UpdateJobRequest,
    UpdateServiceRequest,
} from '@mangodb/shared';
import type { registerSchema } from './auth.schema';
import type {
    changeCredentialsSchema,
    updateCompanyProfileSchema,
} from './company.schema';
import type { deleteCompanyAccountBodySchema } from './admin-company.schema';
import type { createJobSchema, updateJobSchema } from './job.schema';
import type { createProposalSchema } from './proposal.schema';
import type { createProjectUpdateSchema } from './project.schema';
import type {
    createServiceSchema,
    updateServiceSchema,
} from './service.schema';

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

type CreateJobInput = z.infer<typeof createJobSchema>;
type _CreateJobMatchesContract = Assert<CreateJobInput, CreateJobRequest>;
type _ContractMatchesCreateJob = Assert<CreateJobRequest, CreateJobInput>;

type UpdateJobInput = z.infer<typeof updateJobSchema>;
type _UpdateJobMatchesContract = Assert<UpdateJobInput, UpdateJobRequest>;
type _ContractMatchesUpdateJob = Assert<UpdateJobRequest, UpdateJobInput>;

type CreateServiceInput = z.infer<typeof createServiceSchema>;
type _CreateServiceMatchesContract = Assert<
    CreateServiceInput,
    CreateServiceRequest
>;
type _ContractMatchesCreateService = Assert<
    CreateServiceRequest,
    CreateServiceInput
>;

type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
type _UpdateServiceMatchesContract = Assert<
    UpdateServiceInput,
    UpdateServiceRequest
>;
type _ContractMatchesUpdateService = Assert<
    UpdateServiceRequest,
    UpdateServiceInput
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

type CreateProjectUpdateInput = z.infer<typeof createProjectUpdateSchema>;
type _CreateProjectUpdateMatchesContract = Assert<
    CreateProjectUpdateInput,
    CreateProjectUpdateRequest
>;
type _ContractMatchesCreateProjectUpdate = Assert<
    CreateProjectUpdateRequest,
    CreateProjectUpdateInput
>;
