'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TextField from '@/components/sm-detail/TextField';
import Button from '@/components/ui/Button';
import { describeError } from '@/lib/api';
import { login } from '@/lib/session';

// A wrong password and a malformed email both have to read the same. The API
// rejects the second as VALIDATION_FAILED, and showing that would tell an
// attacker the address is not what it is unhappy about.
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
            setError(
                describeError(err, {
                    400: 'Invalid email or password',
                    401: 'Invalid email or password',
                }),
            );
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
                    className="self-end type-xs text-orange hover:underline"
                >
                    Forgot Password ?
                </Link>
            </div>

            <p
                role={error ? 'alert' : undefined}
                aria-live="polite"
                aria-hidden={!error}
                className={`type-sm text-red-600 min-h-5 -mt-2 ${
                    error ? 'visible' : 'invisible'
                }`}
            >
                {error || '\u00A0'}
            </p>

            <Button
                type="submit"
                isLoading={isSubmitting}
                loadingLabel="Logging in…"
                className="-mt-2 w-full py-3 type-sm !font-[600]"
            >
                log in
            </Button>

            <p className="text-center type-sm text-gray-700">
                Don&apos;t have an account?{' '}
                <Link
                    href="/register"
                    className="font-medium text-orange hover:underline"
                >
                    Sign Up
                </Link>
            </p>
        </form>
    );
}
