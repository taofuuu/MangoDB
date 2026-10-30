import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
    deleteCompanyAccount,
    getCompanyAccountDetail,
    listCompanyAccounts,
    updateCompanyAccount,
} from '../controllers/admin-company.controller';

export const adminRoutes = Router();

// Guarded once, so a new admin route cannot be added without the check. The
// account routes below shipped with their own requireAuth and no role check,
// because US6-1 had not landed and there were no administrator sessions to
// require. There are now, so they moved under the guard with everything else:
// a router with a guarded half and an unguarded half is a router someone will
// add a route to on the wrong side of the line.
adminRoutes.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /admin/companies:
 *   get:
 *     tags: [Admin]
 *     summary: List company accounts (admin only)
 *     description: US6-2. Alphabetical. Admin accounts are never listed.
 *     parameters:
 *       - $ref: '#/components/parameters/q'
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [PROVIDER, RECEIVER, BOTH, ADMIN]
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/pageSize'
 *     responses:
 *       '200':
 *         description: One page of accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyAccountSummaryPage'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 */
adminRoutes.get('/companies', listCompanyAccounts);

/**
 * @openapi
 * /admin/companies/{companyId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get one company account (admin only)
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *     responses:
 *       '200':
 *         description: The account, with private contact fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyAccountDetail'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 */
adminRoutes.get('/companies/:companyId', getCompanyAccountDetail);

/**
 * @openapi
 * /admin/companies/{companyId}:
 *   patch:
 *     tags: [Admin]
 *     summary: Edit a company's profile (admin only)
 *     description: US6-3. Profile fields only, not username, email or password.
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCompanyProfileRequest'
 *     responses:
 *       '200':
 *         description: The updated account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompanyAccountDetail'
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
adminRoutes.patch('/companies/:companyId', updateCompanyAccount);

/**
 * @openapi
 * /admin/companies/{companyId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Soft-delete a company account (admin only)
 *     description: US6-4. Needs the admin's own password. 409 while the company has an ongoing project.
 *     parameters:
 *       - $ref: '#/components/parameters/companyId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteCompanyAccountRequest'
 *     responses:
 *       '204':
 *         description: Deleted
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
adminRoutes.delete('/companies/:companyId', deleteCompanyAccount);
