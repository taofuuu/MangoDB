'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AccountType, CompanyProfile } from '@mangodb/shared';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { clearToken, setToken } from '@/lib/auth';
import { getMyProfile } from '@/lib/companies';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// Scaffolding. There is no login page yet — "Build the login page inputs"
// (US1-2) belongs to Dena and Chin — and the 20 seeded companies cannot log in
// at all: their password column holds the literal string "hash123" instead of a
// bcrypt hash. POST /auth/register is public and hands back a token, so that is
// how this page gets one. Delete this route when the real login lands.

const ACCOUNT_TYPES: AccountType[] = ['PROVIDER', 'RECEIVER', 'BOTH'];

// The one password every company this page creates is given, so logging back
// into one only ever needs its email.
const DEV_PASSWORD = 'password123';

// register and login answer with the same pair.
type SessionResponse = { company: CompanyProfile; accessToken: string };

// Module scope, not the component: username and email are unique indexes, so
// every click needs its own, and a clock read does not belong in a render.
function uniqueTag(accountType: AccountType): string {
    return `${accountType.toLowerCase()}_${Date.now()}`;
}

// A failure that never reached the API has no envelope to read a code from.
function describe(err: unknown): string {
    return err instanceof ApiRequestError
        ? `${err.code}: ${err.message}`
        : 'Could not reach the API. Is it running on port 4000?';
}

export default function DevSessionPage() {
    const [company, setCompany] = useState<CompanyProfile | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(DEV_PASSWORD);
    const [pasted, setPasted] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // register and login both end here: keep the token, show who it belongs to.
    const signIn = (result: SessionResponse) => {
        setToken(result.accessToken);
        setCompany(result.company);
        setMessage(`Signed in as ${result.company.username}.`);
    };

    // Who does the stored token belong to? Asking the API is the only way to
    // know, and it doubles as a check that the token still works.
    const refresh = async () => {
        try {
            setCompany(await getMyProfile());
        } catch (err) {
            setCompany(null);
            // 401 on load just means nobody has signed in yet, which is the
            // normal first visit rather than something to report.
            if (err instanceof ApiRequestError && err.status === 401) {
                return;
            }
            setMessage(
                err instanceof ApiRequestError
                    ? `Stored token is not usable: ${err.message}`
                    : 'Could not reach the API. Is it running on port 4000?',
            );
        }
    };

    // Mount only — the stored token cannot change unless this page changes it.
    // Written inline rather than calling refresh() so both writes land in a
    // promise callback; a first visit with no token 401s, which is normal.
    useEffect(() => {
        getMyProfile()
            .then((profile) => setCompany(profile))
            .catch(() => setCompany(null));
    }, []);

    const createCompany = async (accountType: AccountType) => {
        setBusy(true);
        setMessage(null);

        const tag = uniqueTag(accountType);

        try {
            const result = await apiFetch<SessionResponse>('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    company_name: `Dev ${accountType} Co.`,
                    username: `dev_${tag}`,
                    email: `dev_${tag}@example.com`,
                    password: DEV_PASSWORD,
                    phone: '+66 2 000 0000',
                    account_type: accountType,
                    company_type: ['SME'],
                }),
            });

            signIn(result);
            // Prefilled so the next visit can log back into this same company
            // instead of leaving another row behind.
            setEmail(result.company.email);
        } catch (err) {
            setMessage(describe(err));
        } finally {
            setBusy(false);
        }
    };

    // Log back into a company that already exists. Its email is whatever it is
    // now — editing the profile changes it — while the password stays whatever
    // it was registered with.
    const logIn = async () => {
        setBusy(true);
        setMessage(null);

        try {
            const result = await apiFetch<SessionResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim(), password }),
            });

            signIn(result);
        } catch (err) {
            setMessage(describe(err));
        } finally {
            setBusy(false);
        }
    };

    const usePastedToken = async () => {
        if (!pasted.trim()) {
            return;
        }
        setToken(pasted.trim());
        setPasted('');
        setMessage(null);
        await refresh();
    };

    const forgetToken = () => {
        clearToken();
        setCompany(null);
        setMessage(
            'Token forgotten locally. The session itself is still open.',
        );
    };

    return (
        <main className="min-h-screen bg-[#FFFDF9] px-[4.06vw] pt-[6.25vh] text-[#171717]">
            <h1 className="text-hd leading-none">Dev session</h1>

            <p className="mt-[2vh] max-w-[45vw] text-md !font-[400]">
                A stand-in until the login page exists. Log back into a company
                you already made, or register a new one.
            </p>

            <p className="mt-[1vh] max-w-[45vw] text-sm">
                Creating a company writes a real row to the shared Supabase
                database, so prefer logging in — and delete your{' '}
                <code>dev_*</code> companies when you finish, the way the API
                guide asks. The seeded companies cannot log in at all: their
                password column holds a plain string, not a hash. Forgetting the
                token here only drops the local copy; it does not end the
                session on the server.
            </p>

            <div className="mt-[4vh] w-[31.13vw]">
                <h2 className="text-lg leading-[1.15]">
                    Log in to a company you already have
                </h2>

                <p className="mt-[1vh] text-sm">
                    Its email is whatever it is <em>now</em> — editing the
                    profile changes it. The password is unchanged from
                    registration, and everything this page creates uses{' '}
                    <code>{DEV_PASSWORD}</code>.
                </p>

                <div className="mt-[1.5vh]">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        placeholder="dev_provider_1788606010727@example.com"
                    />
                </div>

                <div className="mt-[1.5vh]">
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                    />
                </div>

                <Button
                    onClick={logIn}
                    disabled={busy || !email.trim()}
                    className="mt-[1.5vh] h-[4.5vh] w-[9vw] cursor-pointer text-md"
                >
                    Log in
                </Button>
            </div>

            <h2 className="mt-[4vh] text-lg leading-[1.15]">
                Or create a new company
            </h2>

            <div className="mt-[1.5vh] flex gap-[1.5vw]">
                {ACCOUNT_TYPES.map((accountType) => (
                    <Button
                        key={accountType}
                        onClick={() => createCompany(accountType)}
                        disabled={busy}
                        className="h-[5.46vh] w-[12.66vw] cursor-pointer text-md"
                    >
                        {accountType}
                    </Button>
                ))}
            </div>

            <div className="mt-[4vh] w-[31.13vw]">
                <Input
                    label="Or paste an existing token"
                    value={pasted}
                    onChange={setPasted}
                    placeholder="eyJhbGciOi..."
                />

                <div className="mt-[1.5vh] flex gap-[1vw]">
                    <Button
                        variant="outline"
                        onClick={usePastedToken}
                        className="h-[4.5vh] w-[9vw] cursor-pointer text-md"
                    >
                        Use token
                    </Button>

                    <Button
                        variant="danger"
                        onClick={forgetToken}
                        className="h-[4.5vh] w-[9vw] cursor-pointer text-md"
                    >
                        Forget
                    </Button>
                </div>
            </div>

            <div className="mt-[4vh] max-w-[45vw]">
                <h2 className="text-lg leading-[1.15]">Signed in as</h2>

                {/* The email is here because it is what you log back in with,
                    and it is not guessable once the profile has been edited. */}
                <p className="mt-[1vh] text-md !font-[400]">
                    {company
                        ? `${company.username} · ${company.email} · ${company.account_type} · company_id ${company.company_id}`
                        : 'Nobody. Log in, create a company, or paste a token.'}
                </p>

                {message && (
                    <p className="mt-[1vh] text-md !font-[400] text-[#C5483B]">
                        {message}
                    </p>
                )}
            </div>

            <div className="mt-[4vh] flex gap-[2vw] text-md !font-[400] underline">
                <Link href="/">Back</Link>
            </div>
        </main>
    );
}
