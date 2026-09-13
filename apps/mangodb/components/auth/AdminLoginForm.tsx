'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import FieldError from '@/components/ui/FieldError';
import { describeError } from '@/lib/api';
import { adminLogin } from '@/lib/session';

export default function AdminLoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    // A rejected login is about neither box on its own, so it keeps a line of
    // its own above the button.
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setEmailError(null);
        setPasswordError(null);

        const normalizedEmail = email.trim();

        // Each message goes under the box it is about.
        if (!normalizedEmail) {
            setEmailError('Please enter your email address.');
        }
        if (!password) {
            setPasswordError('Please enter your password.');
        }
        if (!normalizedEmail || !password) {
            return;
        }

        setIsSubmitting(true);

        try {
            await adminLogin(normalizedEmail, password);
            router.push('/');
        } catch (requestError) {
            setError(
                describeError(requestError, {
                    400: 'Invalid email or password.',
                    401: 'Invalid email or password.',
                    403: 'This account does not have administrator access.',
                }),
            );
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
                    onChange={(event) => {
                        setEmail(event.target.value);
                        setEmailError(null);
                    }}
                    autoComplete="email"
                    placeholder="Email"
                    required
                    aria-invalid={emailError ? true : undefined}
                    className="h-[4.89vh] min-h-[44px] w-full rounded-input border border-line bg-white px-[1.04vw] type-sm text-ink outline-none placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <FieldError message={emailError} />
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
                    onChange={(event) => {
                        setPassword(event.target.value);
                        setPasswordError(null);
                    }}
                    autoComplete="current-password"
                    placeholder="Password"
                    required
                    aria-invalid={passwordError ? true : undefined}
                    className="h-[4.89vh] min-h-[44px] w-full rounded-input border border-line bg-white px-[1.04vw] pr-[3.13vw] type-sm text-ink outline-none placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    className="absolute right-[1.04vw] top-1/2 -translate-y-1/2 rounded-input p-[0.31vw] text-ink-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    {showPassword ? (
                        <EyeOff className="h-[1.85vh] min-h-[18px] w-[1.04vw] min-w-[18px]" />
                    ) : (
                        <Eye className="h-[1.85vh] min-h-[18px] w-[1.04vw] min-w-[18px]" />
                    )}
                </button>
                <FieldError message={passwordError} />
            </div>

            <p
                role={error ? 'alert' : undefined}
                aria-live="polite"
                aria-hidden={!error}
                className={`min-h-[2.22vh] type-sm text-danger ${
                    error ? 'visible' : 'invisible'
                }`}
            >
                {error ?? '\u00A0'}
            </p>

            <Button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="h-[4.89vh] min-h-[44px] w-full type-sm !font-[600] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
                {isSubmitting ? 'Logging in…' : 'Login'}
            </Button>
        </form>
    );
}
