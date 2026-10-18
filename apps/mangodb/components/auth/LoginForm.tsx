'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { describeError } from '@/lib/api';
import { login, sanitizeReturnUrl } from '@/lib/session';

// A wrong password and a malformed email both have to read the same. The API
// rejects the second as VALIDATION_FAILED, and showing that would tell an
// attacker the address is not what it is unhappy about.
export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [identifierError, setIdentifierError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    // A rejected login is about neither box on its own, so it keeps a line of
    // its own above the button.
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIdentifierError(null);
        setPasswordError(null);

        // Client-side guard — catch empty fields before hitting the API. Each
        // message goes under the box it is about.
        const missingIdentifier = !identifier.trim();
        const missingPassword = !password;

        if (missingIdentifier) {
            setIdentifierError('Please enter your email address.');
        }
        if (missingPassword) {
            setPasswordError('Please enter your password.');
        }
        if (missingIdentifier || missingPassword) {
            return;
        }

        setIsSubmitting(true);

        try {
            // The session cookie is set on this response, so everything after
            // this point is authenticated.
            await login(identifier, password);
            const nextParam = searchParams.get('next');
            const safeNext = sanitizeReturnUrl(nextParam);
            // No return URL: your profile, not the dev index at /.
            router.push(safeNext ?? '/profile/view');
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
            <Input
                id="identifier"
                label="Email address"
                type="text"
                autoComplete="email"
                value={identifier}
                onChange={(next) => {
                    setIdentifier(next);
                    setIdentifierError(null);
                }}
                error={identifierError ?? undefined}
                variant="login"
                required
            />

            <div className="flex flex-col gap-1.5">
                <Input
                    id="password"
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(next) => {
                        setPassword(next);
                        setPasswordError(null);
                    }}
                    error={passwordError ?? undefined}
                    variant="login"
                    required
                />
                {/* No "Forgot password" link yet: there is no page or story
                    behind it. */}
            </div>

            <p
                role={error ? 'alert' : undefined}
                aria-live="polite"
                aria-hidden={!error}
                className={`type-sm text-danger min-h-5 -mt-2 ${
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

            <p className="text-center type-sm text-ink">
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
