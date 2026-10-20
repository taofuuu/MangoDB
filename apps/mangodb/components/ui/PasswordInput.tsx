'use client';

import { useState } from 'react';
import Input from './Input';

type PasswordInputProps = Omit<
    React.ComponentProps<typeof Input>,
    'type' | 'trailing'
>;

function EyeIcon({ className }: { className: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M4 14.5a8 8 0 0 1 16 0" />
            <circle cx="12" cy="14.5" r="3.5" />
        </svg>
    );
}

// Input for a password, with an eye button that shows or hides what was
// typed. Takes everything Input does except type.
export default function PasswordInput(props: PasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <Input
            {...props}
            type={isVisible ? 'text' : 'password'}
            trailing={
                <button
                    type="button"
                    onClick={() => setIsVisible((visible) => !visible)}
                    aria-label={isVisible ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-ink-soft transition-colors hover:text-ink"
                >
                    <EyeIcon
                        className={`h-4 w-4 ${
                            isVisible ? 'text-ink' : 'text-ink-placeholder'
                        }`}
                    />
                </button>
            }
        />
    );
}
