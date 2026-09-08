import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import { companyRoutes } from './company.routes';
import { serviceRoutes } from './service.routes';
import { certificateRoutes } from './certificate.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/admin', adminRoutes);
routes.use('/companies', companyRoutes);
routes.use('/services', serviceRoutes);
routes.use('/certificates', certificateRoutes);
