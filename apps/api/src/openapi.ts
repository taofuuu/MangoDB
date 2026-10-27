import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import {
    ACCOUNT_TYPES,
    COMPANY_SORT_ORDERS,
    LISTING_STATUSES,
    LISTING_TYPES,
    PROJECT_STATUSES,
    PROJECT_UPDATE_TYPES,
    PROPOSAL_STATUSES,
    QUOTATION_STATUSES,
    SERVICE_SORT_ORDERS,
} from '@mangodb/shared';

// The OpenAPI document Swagger UI shows at /api-docs. The paths come from the
// @openapi comment above each route in routes/*.routes.ts. This file holds
// what they share: the schemas (the «Representation» boxes of the UML API
// Diagrams in docs/api/), the error responses, and the common parameters.
// Shapes follow packages/shared, so a change there must be made here too.

type Schema = Record<string, unknown>;

const ref = (name: string): Schema => ({
    $ref: `#/components/schemas/${name}`,
});
const nullable = (type: string, extra: Schema = {}): Schema => ({
    type: [type, 'null'],
    ...extra,
});
const stringList: Schema = { type: 'array', items: { type: 'string' } };
const idList: Schema = { type: 'array', items: { type: 'integer' } };

// Paged lists answer { items, pagination } (docs/conventions.md §3).
const page = (item: string): Schema => ({
    type: 'object',
    required: ['items', 'pagination'],
    properties: {
        items: { type: 'array', items: ref(item) },
        pagination: ref('PaginationMeta'),
    },
});

const companyBrief: Schema = {
    type: 'object',
    properties: {
        companyId: { type: 'integer', example: 4 },
        companyName: { type: 'string', example: 'Mango Studio' },
        companyPhoto: nullable('string', { format: 'uri' }),
    },
};

const companyProfileProperties: Schema = {
    companyId: { type: 'integer', readOnly: true, example: 4 },
    companyName: { type: 'string', example: 'Mango Studio' },
    companyDescription: nullable('string'),
    username: { type: 'string', example: 'mango' },
    email: { type: 'string', format: 'email' },
    contactEmail: nullable('string', { format: 'email' }),
    phone: { type: 'string', example: '0812345678' },
    address: nullable('string'),
    website: nullable('string', { format: 'uri' }),
    companyPhoto: nullable('string', { format: 'uri' }),
    accountType: { type: 'string', enum: [...ACCOUNT_TYPES] },
    companyType: stringList,
    serviceTerm: nullable('string'),
    warrantyPolicy: nullable('string'),
};

const {
    username: _u,
    email: _e,
    ...publicProfileProperties
} = companyProfileProperties as Record<string, Schema>;

const project: Schema = {
    projectId: { type: 'integer' },
    proposalId: { type: 'integer' },
    totalBudget: { type: 'number' },
    startDate: { type: 'string', format: 'date' },
    projectStatus: { type: 'string', enum: [...PROJECT_STATUSES] },
    depositReportedAt: nullable('string', { format: 'date-time' }),
    depositConfirmedAt: nullable('string', { format: 'date-time' }),
    completedAt: nullable('string', { format: 'date-time' }),
};

const proposal: Schema = {
    proposalId: { type: 'integer' },
    listingId: { type: 'integer' },
    senderId: { type: 'integer' },
    proposalBudget: { type: 'number', example: 50000 },
    proposalTerms: { type: 'string' },
    duration: { type: 'number', description: 'Months, in steps of 0.5' },
    proposalStatus: { type: 'string', enum: [...PROPOSAL_STATUSES] },
    createdAt: { type: 'string', format: 'date-time' },
};

const review: Schema = {
    reviewId: { type: 'integer' },
    projectId: { type: 'integer' },
    workQualityScore: { type: 'integer', minimum: 1, maximum: 5 },
    serviceScore: { type: 'integer', minimum: 1, maximum: 5 },
    valueForMoneyScore: { type: 'integer', minimum: 1, maximum: 5 },
    deliveryTimeScore: { type: 'integer', minimum: 1, maximum: 5 },
    comment: nullable('string', { maxLength: 500 }),
    createdAt: { type: 'string', format: 'date-time' },
};

const listingFields: Schema = {
    listingTitle: { type: 'string', maxLength: 255 },
    listingDesc: { type: 'string', maxLength: 10000 },
    minBudget: nullable('number'),
    maxBudget: nullable('number'),
};

const schemas: Record<string, Schema> = {
    ApiErrorResponse: {
        type: 'object',
        properties: {
            error: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'NOT_FOUND' },
                    message: { type: 'string' },
                    details: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field: { type: 'string' },
                                message: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    },
    PaginationMeta: {
        type: 'object',
        properties: {
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 12 },
            totalItems: { type: 'integer' },
            totalPages: { type: 'integer' },
        },
    },
    CompanyBrief: companyBrief,

    // Auth and the caller's own company.
    RegisterRequest: {
        type: 'object',
        required: [
            'companyName',
            'username',
            'email',
            'password',
            'phone',
            'accountType',
            'companyType',
            'tosAccepted',
        ],
        properties: {
            companyName: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
            phone: { type: 'string', example: '0812345678' },
            accountType: {
                type: 'string',
                enum: ['PROVIDER', 'RECEIVER', 'BOTH'],
            },
            companyType: stringList,
            companyDescription: { type: 'string' },
            address: { type: 'string' },
            website: { type: 'string', format: 'uri' },
            tosAccepted: { type: 'boolean', enum: [true] },
        },
    },
    LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
        },
    },
    IdentityCheck: {
        type: 'object',
        required: ['username', 'email'],
        properties: { username: { type: 'string' }, email: { type: 'string' } },
    },
    IdentityAvailability: {
        type: 'object',
        properties: {
            username: { type: 'string' },
            email: { type: 'string' },
            usernameAvailable: { type: 'boolean' },
            emailAvailable: { type: 'boolean' },
        },
    },
    CompanyProfile: { type: 'object', properties: companyProfileProperties },
    PublicCompanyProfile: {
        type: 'object',
        properties: publicProfileProperties,
    },
    SessionResponse: {
        type: 'object',
        properties: {
            company: ref('CompanyProfile'),
            accessToken: {
                type: 'string',
                description: 'JWT. Also set as the access_token cookie.',
            },
        },
    },
    UpdateCompanyProfileRequest: {
        type: 'object',
        description:
            'Send only the fields to change. null clears a nullable field.',
        properties: {
            companyName: { type: 'string' },
            contactEmail: nullable('string', { format: 'email' }),
            phone: { type: 'string' },
            companyType: stringList,
            companyDescription: nullable('string'),
            address: nullable('string'),
            website: nullable('string', { format: 'uri' }),
            serviceTerm: nullable('string', { description: 'Provider only' }),
            warrantyPolicy: nullable('string', {
                description: 'Provider only',
            }),
        },
    },
    ChangeCredentialsRequest: {
        type: 'object',
        required: ['currentPassword'],
        properties: {
            currentPassword: { type: 'string', format: 'password' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            newPassword: { type: 'string', format: 'password' },
        },
    },
    PhotoUpload: {
        type: 'object',
        required: ['photo'],
        properties: {
            photo: {
                type: 'string',
                format: 'binary',
                description: 'Image, 5MB or smaller',
            },
        },
    },
    CompanySummary: {
        type: 'object',
        properties: {
            companyId: { type: 'integer' },
            companyName: { type: 'string' },
            companyDescription: nullable('string'),
            companyPhoto: nullable('string', { format: 'uri' }),
            accountType: { type: 'string', enum: [...ACCOUNT_TYPES] },
            contactEmail: nullable('string'),
            phone: { type: 'string' },
            website: nullable('string'),
            categories: stringList,
            techStack: stringList,
        },
    },
    CompanySummaryPage: page('CompanySummary'),
    CompletedProject: {
        type: 'object',
        properties: {
            projectId: { type: 'integer' },
            listingType: { type: 'string', enum: [...LISTING_TYPES] },
            listingTitle: { type: 'string' },
            listingDesc: { type: 'string' },
            categories: stringList,
            techStack: stringList,
            startDate: { type: 'string', format: 'date' },
            completedAt: { type: 'string', format: 'date-time' },
            provider: ref('CompanyBrief'),
            receiver: ref('CompanyBrief'),
            rating: nullable('number'),
            reviewComment: nullable('string'),
        },
    },
    CompletedProjectPage: page('CompletedProject'),
    Review: { type: 'object', properties: review },
    CompanyReview: {
        type: 'object',
        properties: { ...review, receiver: ref('CompanyBrief') },
    },
    CompanyReviewPage: page('CompanyReview'),
    ReviewSummary: {
        type: 'object',
        properties: {
            averageRating: nullable('number'),
            ratingCount: { type: 'integer' },
        },
    },
    CreateReviewRequest: {
        type: 'object',
        required: [
            'workQualityScore',
            'serviceScore',
            'valueForMoneyScore',
            'deliveryTimeScore',
        ],
        properties: {
            workQualityScore: { type: 'integer', minimum: 1, maximum: 5 },
            serviceScore: { type: 'integer', minimum: 1, maximum: 5 },
            valueForMoneyScore: { type: 'integer', minimum: 1, maximum: 5 },
            deliveryTimeScore: { type: 'integer', minimum: 1, maximum: 5 },
            comment: nullable('string', { maxLength: 500 }),
        },
    },

    // Admin.
    CompanyAccountSummary: {
        type: 'object',
        properties: {
            companyId: { type: 'integer' },
            companyName: { type: 'string' },
            companyDescription: nullable('string'),
            phone: { type: 'string' },
            accountType: { type: 'string', enum: [...ACCOUNT_TYPES] },
            averageRating: nullable('number'),
            ratingCount: { type: 'integer' },
            deletedAt: nullable('string', { format: 'date-time' }),
        },
    },
    CompanyAccountSummaryPage: page('CompanyAccountSummary'),
    CompanyAccountDetail: {
        type: 'object',
        properties: {
            ...companyProfileProperties,
            averageRating: nullable('number'),
            ratingCount: { type: 'integer' },
            deletedAt: nullable('string', { format: 'date-time' }),
        },
    },
    DeleteCompanyAccountRequest: {
        type: 'object',
        required: ['currentPassword'],
        properties: { currentPassword: { type: 'string', format: 'password' } },
    },

    // Services and their portfolios.
    Service: {
        type: 'object',
        properties: {
            serviceId: { type: 'integer' },
            company: ref('CompanyBrief'),
            type: { type: 'string', enum: ['SERVICE'] },
            ...listingFields,
            listingStatus: { type: 'string', enum: [...LISTING_STATUSES] },
            categoryIds: idList,
            techStack: stringList,
        },
    },
    ServiceSummary: {
        type: 'object',
        properties: {
            serviceId: { type: 'integer' },
            ...listingFields,
            categories: stringList,
            techStack: stringList,
            company: ref('CompanyBrief'),
            averageRating: nullable('number'),
            ratingCount: { type: 'integer' },
        },
    },
    ServiceSummaryPage: page('ServiceSummary'),
    CreateServiceRequest: {
        type: 'object',
        required: ['listingTitle', 'listingDesc'],
        properties: {
            ...listingFields,
            maxBudget: { type: 'number' },
            categoryIds: idList,
            techStack: stringList,
        },
    },
    UpdateServiceRequest: {
        type: 'object',
        description:
            'Send only the fields to change. categoryIds and techStack replace the whole set.',
        properties: {
            ...listingFields,
            categoryIds: idList,
            techStack: stringList,
        },
    },
    ServiceFilterOptions: {
        type: 'object',
        properties: { categories: stringList, techStack: stringList },
    },
    ServicePortfolio: {
        type: 'object',
        properties: {
            portfolioId: { type: 'integer' },
            serviceId: { type: 'integer' },
            portfolioName: { type: 'string' },
            portfolioDescription: nullable('string'),
            developmentDate: { type: 'string', format: 'date' },
            portfolioImage: { type: 'string', format: 'uri' },
            portfolioLink: { type: 'string', format: 'uri' },
        },
    },
    CreatePortfolioRequest: {
        type: 'object',
        required: [
            'serviceId',
            'portfolioName',
            'developmentDate',
            'portfolioLink',
            'portfolioImage',
        ],
        properties: {
            serviceId: { type: 'integer' },
            portfolioName: { type: 'string', maxLength: 255 },
            portfolioDescription: { type: 'string' },
            developmentDate: { type: 'string', format: 'date' },
            portfolioLink: { type: 'string', format: 'uri' },
            portfolioImage: { type: 'string', format: 'binary' },
        },
    },
    UpdatePortfolioRequest: {
        type: 'object',
        description: 'Send at least one field or a new image.',
        properties: {
            portfolioName: { type: 'string', maxLength: 255 },
            portfolioDescription: { type: 'string' },
            developmentDate: { type: 'string', format: 'date' },
            portfolioLink: { type: 'string', format: 'uri' },
            portfolioImage: { type: 'string', format: 'binary' },
        },
    },

    // Certificates.
    Certificate: {
        type: 'object',
        properties: {
            certificateId: { type: 'integer' },
            certTitle: { type: 'string' },
            organization: { type: 'string' },
            certImage: nullable('string', { format: 'uri' }),
            credentialId: nullable('string'),
            credentialUrl: nullable('string', { format: 'uri' }),
            issueMonth: nullable('integer', { minimum: 1, maximum: 12 }),
            issueYear: nullable('integer'),
            expireMonth: nullable('integer', { minimum: 1, maximum: 12 }),
            expireYear: nullable('integer'),
        },
    },
    CertificateRequest: {
        type: 'object',
        description:
            'certTitle and organization are required on create. On update, send at least one field or a new image.',
        properties: {
            certTitle: { type: 'string', maxLength: 255 },
            organization: { type: 'string', maxLength: 255 },
            issueMonth: { type: 'integer', minimum: 1, maximum: 12 },
            issueYear: { type: 'integer' },
            expireMonth: { type: 'integer', minimum: 1, maximum: 12 },
            expireYear: { type: 'integer' },
            credentialId: { type: 'string' },
            credentialUrl: { type: 'string', format: 'uri' },
            certImage: { type: 'string', format: 'binary' },
        },
    },

    // Jobs and proposals.
    Job: {
        type: 'object',
        properties: {
            jobId: { type: 'integer' },
            company: ref('CompanyBrief'),
            ...listingFields,
            listingStatus: { type: 'string', enum: [...LISTING_STATUSES] },
            locationPref: nullable('string'),
            duration: nullable('string'),
            deadline: nullable('string', { format: 'date' }),
            categoryIds: idList,
            categories: stringList,
            createdAt: { type: 'string', format: 'date-time' },
        },
    },
    JobPage: page('Job'),
    CreateJobRequest: {
        type: 'object',
        required: ['listingTitle', 'listingDesc', 'maxBudget'],
        properties: {
            ...listingFields,
            maxBudget: { type: 'number' },
            locationPref: nullable('string'),
            duration: nullable('string'),
            deadline: nullable('string', {
                format: 'date',
                description: 'Today or later',
            }),
            categoryIds: idList,
        },
    },
    UpdateJobRequest: {
        type: 'object',
        description:
            'Send only the fields to change. categoryIds replaces the whole set.',
        properties: {
            ...listingFields,
            maxBudget: { type: 'number' },
            locationPref: nullable('string'),
            duration: nullable('string'),
            deadline: nullable('string', { format: 'date' }),
            categoryIds: idList,
        },
    },
    Proposal: { type: 'object', properties: proposal },
    CreateProposalRequest: {
        type: 'object',
        required: ['proposalBudget', 'proposalTerms', 'duration'],
        properties: {
            proposalBudget: {
                type: 'number',
                exclusiveMinimum: 0,
                example: 50000,
            },
            proposalTerms: { type: 'string', maxLength: 10000 },
            duration: {
                type: 'number',
                maximum: 120,
                example: 1.5,
                description: 'Months, in steps of 0.5',
            },
        },
    },
    ReceivedProposal: {
        type: 'object',
        properties: { ...proposal, sender: ref('CompanyBrief') },
    },
    SentProposal: {
        type: 'object',
        properties: {
            ...proposal,
            listingTitle: { type: 'string' },
            listingType: { type: 'string', enum: ['JOB', 'SERVICE'] },
            recipient: ref('CompanyBrief'),
            projectId: nullable('integer'),
        },
    },
    SentProposalPage: page('SentProposal'),
    ProposalStatusCounts: {
        type: 'object',
        properties: Object.fromEntries(
            ['total', ...PROPOSAL_STATUSES].map((key) => [
                key.toLowerCase(),
                { type: 'integer' },
            ]),
        ),
    },

    // Projects.
    Project: { type: 'object', properties: project },
    ProjectSummary: {
        type: 'object',
        properties: {
            ...project,
            listingTitle: { type: 'string' },
            myRole: { type: 'string', enum: ['provider', 'receiver'] },
            otherParty: ref('CompanyBrief'),
        },
    },
    ProjectSummaryPage: page('ProjectSummary'),
    ProjectDetail: {
        type: 'object',
        properties: {
            ...project,
            listingId: { type: 'integer' },
            listingType: { type: 'string', enum: ['JOB', 'SERVICE'] },
            listingTitle: { type: 'string' },
            provider: ref('CompanyBrief'),
            receiver: ref('CompanyBrief'),
            myRole: { type: 'string', enum: ['provider', 'receiver'] },
        },
    },
    ProjectUpdate: {
        type: 'object',
        properties: {
            projectUpdateId: { type: 'integer' },
            projectId: { type: 'integer' },
            updateType: { type: 'string', enum: [...PROJECT_UPDATE_TYPES] },
            updateText: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
        },
    },
    CreateProjectUpdateRequest: {
        type: 'object',
        required: ['updateText'],
        properties: { updateText: { type: 'string', maxLength: 10000 } },
    },
    RejectWorkRequest: {
        type: 'object',
        required: ['reason'],
        properties: { reason: { type: 'string', maxLength: 10000 } },
    },

    // Quotations (ADR 0017).
    Quotation: {
        type: 'object',
        properties: {
            quotationId: { type: 'integer' },
            projectId: { type: 'integer' },
            quotationFile: {
                type: 'string',
                format: 'uri',
                description: 'Public URL of the PDF',
            },
            quotationStatus: { type: 'string', enum: [...QUOTATION_STATUSES] },
            createdAt: { type: 'string', format: 'date-time' },
        },
    },
    QuotationRequest: {
        type: 'object',
        required: ['file'],
        properties: {
            file: {
                type: 'string',
                format: 'binary',
                description: 'PDF, 5MB or smaller',
            },
        },
    },

    Category: {
        type: 'object',
        properties: {
            categoryId: { type: 'integer' },
            categoryName: { type: 'string' },
        },
    },
};

const errorResponse = (description: string) => ({
    description,
    content: { 'application/json': { schema: ref('ApiErrorResponse') } },
});

const idParam = (name: string) => ({
    in: 'path',
    name,
    required: true,
    schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
});

const queryParam = (name: string, schema: Schema, description?: string) => ({
    in: 'query',
    name,
    required: false,
    schema,
    ...(description && { description }),
});

const definition = {
    openapi: '3.1.0',
    info: {
        title: 'MangoDB API',
        version: '1.0.0',
        description:
            'Sign in with POST /auth/login, copy accessToken, then press Authorize. ' +
            'UML API Diagrams for the same endpoints are in docs/api/.',
    },
    // Same order as the router pages in docs/api/.
    tags: [
        'Health',
        'Auth',
        'Admin',
        'Companies',
        'Services',
        'Portfolios',
        'Certificates',
        'Jobs',
        'Proposals',
        'Projects',
        'Quotations',
        'Categories',
    ].map((name) => ({ name })),
    servers: [
        { url: '/', description: 'The API itself (localhost:4000)' },
        {
            url: '/api',
            description: 'Through the Next.js proxy (localhost:3000)',
        },
    ],
    // Every operation needs a session unless its annotation sets security: [].
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
        },
        schemas,
        responses: {
            BadRequest: errorResponse('VALIDATION_FAILED or BAD_REQUEST'),
            Unauthorized: errorResponse(
                'Not signed in, or the session has ended',
            ),
            Forbidden: errorResponse('Wrong role, or not the owner'),
            NotFound: errorResponse(
                'No such resource, or not visible to the caller',
            ),
            Conflict: errorResponse('The current state does not allow this'),
            TooManyRequests: errorResponse(
                '10 failed sign-ins for this email in 15 minutes',
            ),
        },
        parameters: {
            companyId: idParam('companyId'),
            serviceId: idParam('serviceId'),
            portfolioId: idParam('portfolioId'),
            certificateId: idParam('certificateId'),
            jobId: idParam('jobId'),
            proposalId: idParam('proposalId'),
            projectId: idParam('projectId'),
            quotationId: idParam('quotationId'),
            page: queryParam('page', {
                type: 'integer',
                minimum: 1,
                default: 1,
            }),
            pageSize: queryParam('pageSize', {
                type: 'integer',
                minimum: 1,
                maximum: 50,
                default: 12,
            }),
            q: queryParam(
                'q',
                { type: 'string', maxLength: 100 },
                'Keywords. Every word must match.',
            ),
            listingStatus: queryParam('status', {
                type: 'string',
                enum: [...LISTING_STATUSES],
            }),
            proposalStatus: queryParam('status', {
                type: 'string',
                enum: [...PROPOSAL_STATUSES],
            }),
            companyOrderBy: queryParam('orderBy', {
                type: 'string',
                enum: [...COMPANY_SORT_ORDERS],
                default: 'nameAsc',
            }),
            serviceOrderBy: queryParam('orderBy', {
                type: 'string',
                enum: [...SERVICE_SORT_ORDERS],
                default: 'newest',
            }),
            companyIdQuery: queryParam('companyId', {
                type: 'integer',
                minimum: 1,
            }),
            category: queryParam(
                'category',
                stringList,
                'Category names. Repeat the parameter for more than one.',
            ),
        },
    },
};

export const openapiSpec = swaggerJsdoc({
    definition,
    // .ts under tsx (npm run dev), .js in dist/ (npm start): tsc keeps the
    // /** */ comments the paths are read from.
    apis: [
        path.join(__dirname, 'app.{ts,js}'),
        path.join(__dirname, 'routes', '*.routes.{ts,js}'),
    ],
    // Throw on a broken @openapi block instead of leaving its route out
    failOnErrors: true,
});
