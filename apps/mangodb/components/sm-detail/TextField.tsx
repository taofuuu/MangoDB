import { InputHTMLAttributes, forwardRef } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    ({ label, id, className = '', ...rest }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-sm text-gray-800">
                    {label}
                </label>
                <input
                    ref={ref}
                    id={id}
                    className={`w-full rounded-md border border-[#9FC3DA] bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-shadow focus:border-[#4F7B99] focus:ring-2 focus:ring-[#4F7B99]/30 ${className}`}
                    {...rest}
                />
            </div>
        );
    },
);

TextField.displayName = 'TextField';

export default TextField;
