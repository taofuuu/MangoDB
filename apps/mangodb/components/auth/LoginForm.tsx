'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import TextField from '@/components/sm-detail/TextField';
import Button from '@/components/sm-detail/Button';

export default function LoginForm() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // TODO: wire up real auth, e.g.
            // const res = await fetch("/api/login", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ identifier, password }),
            // });
            // if (!res.ok) throw new Error("Invalid username or password");
            await new Promise((resolve) => setTimeout(resolve, 600));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Something went wrong. Try again.',
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
                label="Username or email address"
                type="text"
                autoComplete="username"
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

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="mt-2">
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
