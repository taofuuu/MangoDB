import './env';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Builds the app without listening so tests can drive it with supertest.
export function createApp() {
    const app = express();

    // TODO: before deploying, restrict origin to the frontend URL, e.g.:
    // app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
    app.use(
        cors({ origin: process.env.FRONTEND_URL || true, credentials: true }),
    );
    app.use(express.json());
    app.use(cookieParser());

    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    app.use(routes);

    // Both must stay last, in this order.
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
