import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    isLoading?: boolean;
}

export default function Button({
    children,
    isLoading = false,
    disabled,
    className = '',
    ...rest
}: ButtonProps) {
    return (
        <button
            disabled={disabled || isLoading}
            aria-busy={isLoading}
            className={`w-full rounded-full bg-[#4F7B99] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#446B86] focus:outline-none focus:ring-2 focus:ring-[#4F7B99] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            {...rest}
        >
            {isLoading ? 'Logging in…' : children}
        </button>
    );
}
