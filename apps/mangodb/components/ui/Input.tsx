'use client';

import FieldError from './FieldError';

type InputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    // Filled in by the "Validate required profile fields and formats" task.
    // The slot lives here so adding a rule never has to touch this file.
    error?: string | undefined;
} & Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'className'
>;

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
    ...props
}: InputProps) {
    const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-[0.46vh]">
            <label
                htmlFor={inputId}
                className="mb-[0.93vh] block type-md leading-[1.15]"
            >
                {label}
            </label>

            <input
                id={inputId}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={`h-[4.79vh] w-full rounded-input border bg-surface-white px-[0.83vw] type-sm text-ink placeholder:text-line focus:ring-1 focus:outline-none ${
                    error
                        ? 'border-danger focus:border-danger focus:ring-danger'
                        : 'border-brand focus:border-brand focus:ring-brand'
                }`}
                {...props}
            />

            <FieldError message={error} id={`${inputId}-error`} />
        </div>
    );
}
