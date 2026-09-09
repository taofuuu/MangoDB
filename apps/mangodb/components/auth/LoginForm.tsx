'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TextField from '@/components/sm-detail/TextField';
import Button from '@/components/sm-detail/Button';

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
            const apiUrl =
                process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // credentials: 'include' sends/receives the httpOnly cookie
                // the API sets on login, keeping the token out of JS reach.
                credentials: 'include',
                body: JSON.stringify({ email: identifier, password }),
            });

            // Parse the body first; a non-JSON response just gives us null and
            // the status below still decides what the user sees.
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setError(data?.error?.message || 'Invalid email or password');
                return;
            }

            router.push('/');
        } catch {
            setError('Could not reach the server. Try again.');
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
