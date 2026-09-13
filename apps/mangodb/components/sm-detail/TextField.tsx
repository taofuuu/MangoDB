import { InputHTMLAttributes, forwardRef } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    ({ label, id, className = '', ...rest }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={id} className="type-sm text-gray-800">
                    {label}
                </label>
                <input
                    ref={ref}
                    id={id}
                    className={`h-[4.89vh] px-1.5 flex w-full items-center justify-between rounded-input border border-brand-dark bg-surface-white/80`}
                    {...rest}
                />
            </div>
        );
    },
);

TextField.displayName = 'TextField';

export default TextField;
