import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import { companyRoutes } from './company.routes';
import { serviceRoutes } from './service.routes';
import { portfolioRoutes } from './portfolio.routes';
import { certificateRoutes } from './certificate.routes';
import { jobPostingRoutes } from './job-posting.routes';
import { proposalRoutes } from './proposal.routes';
import { categoryRoutes } from './category.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/companies', companyRoutes);
routes.use('/services', serviceRoutes);
routes.use('/portfolios', portfolioRoutes);
routes.use('/certificates', certificateRoutes);
routes.use('/job-postings', jobPostingRoutes);
routes.use('/proposals', proposalRoutes);
routes.use('/categories', categoryRoutes);
