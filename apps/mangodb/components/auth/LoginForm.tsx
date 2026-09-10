'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TextField from '@/components/sm-detail/TextField';
import Button from '@/components/sm-detail/Button';
import { ApiRequestError } from '@/lib/api';
import { login } from '@/lib/session';

// A wrong password and a malformed email both have to read the same. The API
// rejects the second as VALIDATION_FAILED, and showing that would tell an
// attacker the address is not what it is unhappy about.
function messageFor(err: unknown): string {
    if (!(err instanceof ApiRequestError)) {
        return 'Could not reach the server. Try again.';
    }
    if (err.status === 400 || err.status === 401) {
        return 'Invalid email or password';
    }
    return err.message;
}

export default function LoginForm() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        // Client-side guard — catch empty fields before hitting the API.
        if (!identifier.trim() && !password) {
            setError('Please enter your email and password.');
            return;
        }
        if (!identifier.trim()) {
            setError('Please enter your email address.');
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            return;
        }

        setIsSubmitting(true);

        try {
            // The session cookie is set on this response, so everything after
            // this point is authenticated.
            await login(identifier, password);
            router.push('/');
        } catch (err) {
            setError(messageFor(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-4"
            noValidate
        >
            <TextField
                id="identifier"
                label="Email address"
                type="text"
                autoComplete="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
            />

            <div className="flex flex-col gap-1.5">
                <TextField
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Link
                    href="/forgot-password"
                    className="self-end text-xs text-[#D9603B] hover:underline"
                >
                    Forgot Password ?
                </Link>
            </div>

            <p
                role={error ? 'alert' : undefined}
                aria-live="polite"
                aria-hidden={!error}
                className={`text-sm text-red-600 min-h-5 -mt-2 ${
                    error ? 'visible' : 'invisible'
                }`}
            >
                {error || '\u00A0'}
            </p>

            <Button type="submit" isLoading={isSubmitting} className="-mt-2">
                log in
            </Button>

            <p className="text-center text-sm text-gray-700">
                Don&apos;t have an account?{' '}
                <Link
                    href="/signup"
                    className="font-medium text-[#D9603B] hover:underline"
                >
                    Sign Up
                </Link>
            </p>
        </form>
    );
}
