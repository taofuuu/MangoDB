import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth, requireRole } from './middleware/auth';
import { revokeToken } from './auth/tokenDenylist';

dotenv.config({ quiet: true });

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Protected: proves requireAuth populates req.auth from the access token.
// The full profile lookup lands with the user repository (US1-4).
app.get('/me', requireAuth, (req: Request, res: Response) => {
    res.json({ id: req.auth!.sub, role: req.auth!.role });
});

// US1-3. Ends the session by revoking this token: every later request that
// presents it is rejected by requireAuth. requireAuth runs first, so logging
// out twice with the same token gives 401 on the second call.
app.post('/auth/logout', requireAuth, (req: Request, res: Response) => {
    revokeToken(req.auth!.jti, req.auth!.exp);
    res.status(204).end();
});

// Protected + role-gated: proves requireRole rejects non-admin tokens (US6-1).
app.get(
    '/admin/ping',
    requireAuth,
    requireRole('admin'),
    (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    },
);

app.listen(port, () => {
    console.log(`api listening on http://localhost:${port}`);
});
