'use client';

import FieldError from './FieldError';

type TextareaProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string | undefined;
    // Height or custom styles — e.g. custom height for location
    className?: string | undefined;
    variant?: 'form' | 'small';
} & Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'onChange' | 'className'
>;

const VARIANTS = {
    form: {
        field: 'gap-[0.46vh]',
        label: 'mb-[0.93vh] block type-md leading-[1.15]',
        textarea: 'h-[13.36vh] px-[0.83vw] py-[1vh]',
        border: 'border-brand focus:border-brand focus:ring-brand',
    },
    small: {
        field: 'gap-1',
        label: 'mb-1.5 block type-sm !font-[600] text-ink',
        textarea: 'h-[88px] px-3.5 py-2',
        border: 'border-line focus:border-brand focus:ring-brand',
    },
};

export default function Textarea({
    label,
    value,
    onChange,
    error,
    className,
    variant = 'form',
    id,
    ...props
}: TextareaProps) {
    const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const look = VARIANTS[variant];

    return (
        <div className={`flex min-w-0 flex-1 flex-col ${look.field}`}>
            <label htmlFor={inputId} className={look.label}>
                {label}
            </label>

            <textarea
                id={inputId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={`block w-full resize-none rounded-input border bg-surface-white type-sm text-ink placeholder:text-line transition-colors focus:ring-1 focus:outline-none ${look.textarea} ${className ?? ''} ${
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
