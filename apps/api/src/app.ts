import express, { type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { FRONTEND_URL } from './env';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Builds the app without listening so tests can drive it with supertest.
export function createApp() {
    const app = express();

    // credentials: true plus origin: true would let *any* site make
    // credentialed calls to this API with the visitor's session cookie. It was
    // that way because the register page used to call the API cross-origin
    // directly; it does not any more — the browser only ever talks to Next,
    // which proxies /api/* here (see next.config.ts).
    //
    // So: named origins only in production. Locally, FRONTEND_URL is usually
    // unset and http://localhost:3000 is the answer anyway.
    app.use(
        cors({
            origin: FRONTEND_URL ?? 'http://localhost:3000',
            credentials: true,
        }),
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
