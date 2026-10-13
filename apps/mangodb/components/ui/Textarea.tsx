'use client';

import FieldError from './FieldError';

type TextareaProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string | undefined;
    // Height only — the design gives Company Location a taller box than the
    // rest, and everything else about the field is identical.
    className?: string | undefined;
} & Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'onChange' | 'className'
>;

export default function Textarea({
    label,
    value,
    onChange,
    error,
    className = 'h-[13.36vh]',
    id,
    ...props
}: TextareaProps) {
    const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-[0.46vh]">
            <label
                htmlFor={inputId}
                className="mb-[0.93vh] block type-md leading-[1.15]"
            >
                {label}
            </label>

            <textarea
                id={inputId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={`block w-full resize-none rounded-input border border-brand bg-white px-[0.83vw] py-[1vh] type-sm text-ink placeholder:text-line focus:ring-1 focus:ring-brand focus:outline-none ${className} ${
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
