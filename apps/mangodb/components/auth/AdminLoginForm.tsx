'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiRequestError } from '@/lib/api';
import { adminLogin } from '@/lib/session';

function describeLoginError(error: unknown): string {
    if (!(error instanceof ApiRequestError)) {
        return 'Could not reach the server. Please try again.';
    }

    if (error.status === 400 || error.status === 401) {
        return 'Invalid email or password.';
    }

    if (error.status === 403) {
        return 'This account does not have administrator access.';
    }

    return error.message;
}

export default function AdminLoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const normalizedEmail = email.trim();

        if (!normalizedEmail && !password) {
            setError('Please enter your email and password.');
            return;
        }
        if (!normalizedEmail) {
            setError('Please enter your email address.');
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            return;
        }

        setIsSubmitting(true);

        try {
            await adminLogin(normalizedEmail, password);
            router.replace('/companies');
        } catch (requestError) {
            setError(describeLoginError(requestError));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-[1.85vh]"
            noValidate
        >
            <div>
                <label htmlFor="admin-email" className="sr-only">
                    Email
                </label>
                <input
                    id="admin-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="Email"
                    required
                    className="h-[4.89vh] min-h-[44px] w-full rounded-input border border-[#D6D6D6] bg-white px-[1.04vw] text-sm text-[#171717] outline-none placeholder:text-[#A3A3A3] focus:border-[#497B93] focus:ring-1 focus:ring-[#497B93]"
                />
            </div>

            <div className="relative">
                <label htmlFor="admin-password" className="sr-only">
                    Password
                </label>
                <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Password"
                    required
                    className="h-[4.89vh] min-h-[44px] w-full rounded-input border border-[#D6D6D6] bg-white px-[1.04vw] pr-[3.13vw] text-sm text-[#171717] outline-none placeholder:text-[#A3A3A3] focus:border-[#497B93] focus:ring-1 focus:ring-[#497B93]"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    className="absolute right-[1.04vw] top-1/2 -translate-y-1/2 rounded-input p-[0.31vw] text-[#757575] hover:text-[#497B93] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#497B93]"
                >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </div>

            <p
                role={error ? 'alert' : undefined}
                aria-live="polite"
                aria-hidden={!error}
                className={`min-h-[2.22vh] text-sm text-[#C5483B] ${
                    error ? 'visible' : 'invisible'
                }`}
            >
                {error ?? '\u00A0'}
            </p>

            <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="h-[4.89vh] min-h-[44px] w-full rounded-button bg-[#497B93] text-sm !font-[600] text-white transition-colors hover:bg-[#3F6B80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#497B93] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isSubmitting ? 'Logging in…' : 'Login'}
            </button>
        </form>
    );
}

function EyeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[1.85vh] min-h-[18px] w-[1.04vw] min-w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[1.85vh] min-h-[18px] w-[1.04vw] min-w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="m3 3 18 18" />
            <path d="M10.6 6.2A11.7 11.7 0 0 1 12 6c6.5 0 10 6 10 6a17.8 17.8 0 0 1-2.1 2.8M6.1 6.1C3.4 8 2 12 2 12s3.5 6 10 6a10.7 10.7 0 0 0 3.4-.5" />
        </svg>
    );
}
