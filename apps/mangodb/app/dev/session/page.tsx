'use client';

// THROWAWAY — do not import from this file, and do not copy it as a pattern.
// It is one self-contained file on purpose: the button, the input, the API
// client and the token helpers below are quick stand-ins so this page can get a
// token. They are not shared code. The real versions belong to the login page
// (US1-2, Dena and Chin) and to whoever builds the shared UI kit.
//
// Why the page exists: there is no login page yet, and the 20 seeded companies
// cannot log in — their password column holds the literal string "hash123"
// instead of a bcrypt hash. POST /auth/register is public and hands back a
// token, so that is how this page gets one.
//
// Delete app/dev/ when the real login lands.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
    AccountType,
    ApiErrorCode,
    ApiErrorDetail,
    ApiErrorResponse,
    CompanyProfile,
} from '@mangodb/shared';

const ACCOUNT_TYPES: AccountType[] = ['PROVIDER', 'RECEIVER', 'BOTH'];

// The one password every company this page creates is given, so logging back
// into one only ever needs its email.
const DEV_PASSWORD = 'password123';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'mangodb.token';

// register and login answer with the same pair.
type SessionResponse = { company: CompanyProfile; accessToken: string };

/* --- token ---------------------------------------------------------- */

// The access token lives in localStorage. Every read is guarded because the
// page renders on the server first, where there is no window to read from.
function getToken(): string | null {
    return typeof window === 'undefined'
        ? null
        : window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_KEY, token);
    }
}

// Forgetting the token is not the same as ending the session: the token stays
// signed and valid until it expires. Only POST /auth/logout revokes it.
function clearToken(): void {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_KEY);
    }
}

/* --- api ------------------------------------------------------------ */

// Every non-2xx from the API arrives in the same envelope, so one error class
// covers all of them. `code` is the stable half to switch on.
class ApiRequestError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly details: ApiErrorDetail[];

    constructor(
        status: number,
        code: ApiErrorCode,
        message: string,
        details: ApiErrorDetail[] = [],
    ) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

// Reads the error envelope. A failure that never reached the API — a proxy, a
// crash — has no envelope, so fall back to something the user can act on.
async function toRequestError(response: Response): Promise<ApiRequestError> {
    try {
        const body = (await response.json()) as ApiErrorResponse;
        return new ApiRequestError(
            response.status,
            body.error.code,
            body.error.message,
            body.error.details ?? [],
        );
    } catch {
        return new ApiRequestError(
            response.status,
            'INTERNAL',
            `Request failed with status ${response.status}`,
        );
    }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();

    const response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...init.headers,
        },
    });

    if (!response.ok) {
        throw await toRequestError(response);
    }

    // 204 is the success shape for logout and deletes — no body to parse.
    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

function getMyProfile(): Promise<CompanyProfile> {
    return apiFetch<CompanyProfile>('/companies/me');
}

/* --- local ui ------------------------------------------------------- */

type ButtonVariant = 'primary' | 'outline' | 'danger';

// Fill and border only. Every button here passes its own size through
// className rather than picking from a size prop.
const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[#497B93] text-[#FFFDF9] hover:bg-[#3F6B80]',
    outline:
        'border border-[#497B93] bg-white text-[#171717] hover:bg-[#497B93]/10',
    danger: 'bg-[#C5483B] text-[#FFFDF9] hover:bg-[#A93B30]',
};

type ButtonProps = {
    variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
    variant = 'primary',
    className = '',
    // Buttons inside a <form> submit by default; only the one that means it
    // should say so.
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={`rounded-button transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        />
    );
}

type InputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
} & Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'className'
>;

function Input({
    label,
    value,
    onChange,
    id,
    // Spelled out so the field reaches the accessibility tree as a textbox
    // rather than an input with no type.
    type = 'text',
    ...props
}: InputProps) {
    const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return (
        <div>
            <label
                htmlFor={inputId}
                className="mb-[0.93vh] block text-lg leading-[1.15]"
            >
                {label}
            </label>

            <input
                id={inputId}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-[4.79vh] w-full rounded-button border-[0.75px] border-black bg-white px-[0.83vw] text-md text-[#171717] placeholder:text-[#D6D6D6] focus:ring-1 focus:ring-[#497B93] focus:outline-none"
                {...props}
            />
        </div>
    );
}

/* --- page ----------------------------------------------------------- */

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
