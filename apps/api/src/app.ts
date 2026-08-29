import './env';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Builds the app without listening so tests can drive it with supertest.
export function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    app.use(routes);

    // Both must stay last, in this order.
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
