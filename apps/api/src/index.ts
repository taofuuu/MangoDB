import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { User } from '@mangodb/shared';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Placeholder — proves the shared workspace type resolves.
app.get('/me', (_req: Request, res: Response) => {
    const user: User = {
        id: '1',
        role: 'admin',
        email: 'admin@mangodb.local',
    };
    res.json(user);
});

app.listen(port, () => {
    console.log(`api listening on http://localhost:${port}`);
});
