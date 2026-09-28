import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import { companyRoutes } from './company.routes';
import { portfolioRoutes } from './portfolio.routes';
import { certificateRoutes } from './certificate.routes';
import { providerRoutes } from './provider.routes';
import { jobPostingRoutes } from './job-posting.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/companies', companyRoutes);
routes.use('/portfolios', portfolioRoutes);
routes.use('/certificates', certificateRoutes);
routes.use('/providers', providerRoutes);
routes.use('/job-postings', jobPostingRoutes);
