import { InputHTMLAttributes, forwardRef } from 'react';
import FieldError from '@/components/ui/FieldError';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string | undefined;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    ({ label, id, error, className = '', ...rest }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={id} className="type-sm text-gray-800">
                    {label}
                </label>
                <input
                    ref={ref}
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`h-[4.89vh] px-1.5 flex w-full items-center justify-between rounded-input border border-brand-dark bg-surface-white/80`}
                    {...rest}
                />
                <FieldError message={error} id={`${id}-error`} />
            </div>
        );
    },
);

TextField.displayName = 'TextField';

export default TextField;
