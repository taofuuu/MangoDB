import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth, requireRole } from './middleware/auth';
import { checkCompanyIdentityAvailability } from './services/company-uniqueness';
import { prisma } from './lib/prisma';
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

// Protected + role-gated: proves requireRole rejects non-admin tokens (US6-1).
app.get(
    '/admin/ping',
    requireAuth,
    requireRole('admin'),
    (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    },
);

// checking availability of username and email
app.post('/auth/check-availability', async (req, res) => {
    const body = req.body ?? {};
    const { username, email } = body;

    if (typeof username !== 'string' || typeof email !== 'string') {
        res.status(400).json({
            error: 'Username and email are required',
        });
        return;
    }
    try {
        const result = await checkCompanyIdentityAvailability({
            username,
            email,
        });
        res.status(200).json(result);
    } catch (error) {
        console.error('Uniqueness check failed:', error);
        res.status(500).json({
            error: 'Unable to check username and email',
        });
    }
});

app.listen(port, () => {
    console.log(`api listening on http://localhost:${port}`);
});
