import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import {
    changeMyCredentials,
    deleteMyAccount,
    deleteMyPhoto,
    getCompanyProfile,
    getMyProfile,
    getProviderReviewSummary,
    listCompanies,
    listProviderReviews,
    updateMyPhoto,
    updateMyProfile,
} from '../controllers/company.controller';
import { listProviderCompletedProjects } from '../controllers/project.controller';

// Mounted at /companies. GET / searches other companies; everything under /me
// operates on the caller's own account.
export const companyRoutes = Router();

// GET /companies, not /companies/search (conventions 2.10): a search is the
// collection with filters on it, like GET /admin/companies. Any company may
// search, admins may not. requireRole understands that BOTH grants both roles.
/**
 * @openapi
 * /companies:
 *   get:
 *     tags: [Companies]
 *     summary: Search companies
 *     description: T3.6.7. Any company, not admins. Deleted companies are hidden.
 *     parameters:
 *       - $ref: '#/components/parameters/q'
 *       - $ref: '#/components/parameters/companyOrderBy'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of companies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanySummaryPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
companyRoutes.get(
    '/',
    requireAuth,
    requireRole('provider', 'receiver'),
    listCompanies,
);

/**
 * @openapi
 * /companies/me:
 *   get:
 *     tags: [Companies]
 *     summary: Get my profile
 *     description: US1-4.
 *     responses:
 *       '200':
 *         description: The caller's profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.get('/me', requireAuth, getMyProfile);

/**
 * @openapi
 * /companies/me:
 *   patch:
 *     tags: [Companies]
 *     summary: Edit my profile
 *     description: US1-5. serviceTerm and warrantyPolicy are for providers only (403).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCompanyProfileRequest'
 *     responses:
 *       '200':
 *         description: The updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
companyRoutes.patch('/me', requireAuth, updateMyProfile);

// Username, email, and password. Separate from /me because every change here
// needs the current password, and mixing the two would put a gate on a route
// that also has an ungated path through it.
/**
 * @openapi
 * /companies/me/credentials:
 *   patch:
 *     tags: [Companies]
 *     summary: Change my username, email or password
 *     description: Needs the current password. Returns a new token and revokes the old one.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangeCredentialsRequest'
 *     responses:
 *       '200':
 *         description: Changed, with a new session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SessionResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
companyRoutes.patch('/me/credentials', requireAuth, changeMyCredentials);

// The profile photo. Separate from /me because the body is multipart, which
// PATCH /me is not — see updateMyPhoto. Any company may have one, so no
// requireRole here.
/**
 * @openapi
 * /companies/me/photo:
 *   patch:
 *     tags: [Companies]
 *     summary: Upload my profile photo
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/PhotoUpload'
 *     responses:
 *       '200':
 *         description: The updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.patch(
    '/me/photo',
    requireAuth,
    uploadImage('photo'),
    updateMyPhoto,
);

/**
 * @openapi
 * /companies/me/photo:
 *   delete:
 *     tags: [Companies]
 *     summary: Remove my profile photo
 *     responses:
 *       '200':
 *         description: The updated profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyProfile'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.delete('/me/photo', requireAuth, deleteMyPhoto);

// A provider, receiver, or BOTH company may delete itself. Administrators use
// their own account-management routes and must not enter this self-service
// flow. requireRole understands that BOTH grants both company roles.
/**
 * @openapi
 * /companies/me:
 *   delete:
 *     tags: [Companies]
 *     summary: Delete my account
 *     description: US1-6. Soft delete. 409 while the company has an ongoing project.
 *     responses:
 *       '204':
 *         description: Deleted
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '409':
 *         $ref: '#/components/responses/Conflict'
 */
companyRoutes.delete(
    '/me',
    requireAuth,
    requireRole('provider', 'receiver'),
    deleteMyAccount,
);

// US2-5. A Provider's completed work, newest first, for its public profile.
/**
 * @openapi
 * /companies/{companyId}/completed-projects:
 *   get:
 *     tags: [Companies]
 *     summary: List a provider's completed projects
 *     description: US2-5. Newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of completed projects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompletedProjectPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.get(
    '/:companyId/completed-projects',
    requireAuth,
    requireRole('provider', 'receiver'),
    listProviderCompletedProjects,
);

// US5-3. A Provider's reviews on completed projects, newest first. Paged.
/**
 * @openapi
 * /companies/{companyId}/reviews:
 *   get:
 *     tags: [Companies]
 *     summary: List a provider's reviews
 *     description: US5-3. Newest first.
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of reviews
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyReviewPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.get(
    '/:companyId/reviews',
    requireAuth,
    requireRole('provider', 'receiver'),
    listProviderReviews,
);

// US5-3. A Provider's rating summary (average and review count).
/**
 * @openapi
 * /companies/{companyId}/reviews/summary:
 *   get:
 *     tags: [Companies]
 *     summary: Get a provider's rating summary
 *     description: US5-3. Average score and review count.
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *     responses:
 *       '200':
 *         description: The rating summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewSummary'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.get(
    '/:companyId/reviews/summary',
    requireAuth,
    requireRole('provider', 'receiver'),
    getProviderReviewSummary,
);
// Another company's public profile. Last, after every /me route, so "me" is
// never read as an id. Same callers as the search above: any company, not
// admins, who have GET /admin/companies/:companyId.
/**
 * @openapi
 * /companies/{companyId}:
 *   get:
 *     tags: [Companies]
 *     summary: Get another company's public profile
 *     description: Unknown, deleted and admin ids all answer 404.
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *     responses:
 *       '200':
 *         description: The public profile, without username and email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicCompanyProfile'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
companyRoutes.get(
    '/:companyId',
    requireAuth,
    requireRole('provider', 'receiver'),
    getCompanyProfile,
);
