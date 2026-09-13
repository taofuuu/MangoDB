'use client';

// THROWAWAY — do not import from this file, and do not copy it as a pattern.
// The buttons and inputs below are quick stand-ins; the real versions belong to
// whoever builds the shared UI kit. The API client and token helpers this file
// used to carry are gone: those exist for real in lib/ now, and this page goes
// through them like every other page.
//
// Why it outlived the login page: there is still no /signup, and the 20 seeded
// companies cannot log in — their password column holds the literal string
// "hash123" instead of a bcrypt hash. POST /auth/register is public, so this is
// the only way to get an account worth logging in with.
//
// Delete app/dev/ once /signup exists.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
    AccountType,
    CompanyProfile,
    SessionResponse,
} from '@mangodb/shared';
import { apiFetch, describeError } from '@/lib/api';
import { getMyProfile } from '@/lib/companies';
import { login } from '@/lib/session';

const ACCOUNT_TYPES: AccountType[] = ['PROVIDER', 'RECEIVER', 'BOTH'];

// The one password every company this page creates is given, so logging back
// into one only ever needs its email.
const DEV_PASSWORD = 'password123';

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

export default function DevSessionPage() {
    const [company, setCompany] = useState<CompanyProfile | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(DEV_PASSWORD);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // register and login both end here. Nothing to store — the API set the
    // session cookie on the response that got us here.
    const signIn = (profile: CompanyProfile) => {
        setCompany(profile);
        setMessage(`Signed in as ${profile.username}.`);
    };

    // Mount only. Who the cookie belongs to is a question only the API can
    // answer, and asking doubles as a check that the session still works. A
    // first visit with nobody signed in 401s, which is normal.
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
                    companyName: `Dev ${accountType} Co.`,
                    username: `dev_${tag}`,
                    email: `dev_${tag}@example.com`,
                    password: DEV_PASSWORD,
                    phone: '+66 2 000 0000',
                    accountType: accountType,
                    companyType: ['SME'],
                }),
            });

            signIn(result.company);
            // Prefilled so the next visit can log back into this same company
            // instead of leaving another row behind.
            setEmail(result.company.email);
        } catch (err) {
            setMessage(
                describeError(err, {
                    offline:
                        'Could not reach the API. Is it running on port 4000?',
                }),
            );
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
            signIn(await login(email.trim(), password));
        } catch (err) {
            setMessage(
                describeError(err, {
                    offline:
                        'Could not reach the API. Is it running on port 4000?',
                }),
            );
        } finally {
            setBusy(false);
        }
    };

    // The real thing, not a local forget: /auth/logout revokes the token and
    // clears the cookie, so the session is over on the server too.
    const logOut = async () => {
        setBusy(true);
        setMessage(null);

        try {
            await apiFetch<void>('/auth/logout', { method: 'POST' });
            setCompany(null);
            setMessage('Signed out.');
        } catch (err) {
            setMessage(
                describeError(err, {
                    offline:
                        'Could not reach the API. Is it running on port 4000?',
                }),
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FFFDF9] px-[4.06vw] pt-[6.25vh] text-[#171717]">
            <h1 className="text-hd leading-none">Dev session</h1>

            <p className="mt-[2vh] max-w-[45vw] text-md !font-[400]">
                A stand-in until /signup exists. Register a company here, then
                sign in with it anywhere — including the real{' '}
                <Link href="/login" className="underline">
                    login page
                </Link>
                .
            </p>

            <p className="mt-[1vh] max-w-[45vw] text-sm">
                Creating a company writes a real row to the shared Supabase
                database, so prefer logging in — and delete your{' '}
                <code>dev_*</code> companies when you finish, the way the API
                guide asks. The seeded companies cannot log in at all: their
                password column holds a plain string, not a hash. Signing in
                here is the same session the rest of the app uses, so you can go
                straight to any page afterwards.
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
                <Button
                    variant="danger"
                    onClick={logOut}
                    disabled={busy || !company}
                    className="h-[4.5vh] w-[9vw] cursor-pointer text-md"
                >
                    Log out
                </Button>
            </div>

            <div className="mt-[4vh] max-w-[45vw]">
                <h2 className="text-lg leading-[1.15]">Signed in as</h2>

                {/* The email is here because it is what you log back in with,
                    and it is not guessable once the profile has been edited. */}
                <p className="mt-[1vh] text-md !font-[400]">
                    {company
                        ? `${company.username} · ${company.email} · ${company.accountType} · companyId ${company.companyId}`
                        : 'Nobody. Log in or create a company.'}
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
