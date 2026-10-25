import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import { companyRoutes } from './company.routes';
import { serviceRoutes } from './service.routes';
import { portfolioRoutes } from './portfolio.routes';
import { certificateRoutes } from './certificate.routes';
import { jobRoutes } from './job.routes';
import { proposalRoutes } from './proposal.routes';
import { projectRoutes } from './project.routes';
import { quotationRoutes } from './quotation.routes';
import { categoryRoutes } from './category.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/companies', companyRoutes);
routes.use('/services', serviceRoutes);
routes.use('/portfolios', portfolioRoutes);
routes.use('/certificates', certificateRoutes);
routes.use('/jobs', jobRoutes);
routes.use('/proposals', proposalRoutes);
routes.use('/projects', projectRoutes);
routes.use('/quotations', quotationRoutes);
routes.use('/categories', categoryRoutes);
