'use client';

import FieldError from './FieldError';

type InputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    // Filled in by the "Validate required profile fields and formats" task.
    // The slot lives here so adding a rule never has to touch this file.
    error?: string | undefined;
    // login: the login card's own sizes, a small label over larger typed
    // text. Every other form uses form.
    variant?: keyof typeof VARIANTS;
} & Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'className'
>;

const VARIANTS = {
    form: {
        field: 'gap-[0.46vh]',
        label: 'mb-[0.93vh] block type-md leading-[1.15]',
        input: 'h-[4.79vh] px-[0.83vw] type-sm',
        border: 'border-brand focus:border-brand focus:ring-brand',
    },
    // No type-* on the input: it inherits the page's 16px.
    login: {
        field: 'gap-1.5',
        label: 'block type-sm',
        input: 'h-[4.89vh] px-1.5',
        border: 'border-brand-dark focus:border-brand-dark focus:ring-brand-dark',
    },
};

// The design draws Username with a 5.625 corner radius and every other
// single-line field with 10.875. Built at the common radius; raised with the
// designers rather than reproduced.
export default function Input({
    label,
    value,
    onChange,
    error,
    id,
    // Spelled out so the field reaches the accessibility tree as a textbox
    // rather than an input with no type.
    type = 'text',
    variant = 'form',
    ...props
}: InputProps) {
    const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const look = VARIANTS[variant];

    return (
        <div className={`flex min-w-0 flex-1 flex-col ${look.field}`}>
            <label htmlFor={inputId} className={look.label}>
                {label}
            </label>

            <input
                id={inputId}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={`${look.input} w-full rounded-input border bg-surface-white text-ink placeholder:text-line focus:ring-1 focus:outline-none ${
                    error
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : look.border
                }`}
                {...props}
            />

            <FieldError message={error} id={`${inputId}-error`} />
        </div>
    );
}
