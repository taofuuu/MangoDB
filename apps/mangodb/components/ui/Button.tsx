'use client';

type ButtonVariant = 'primary' | 'outline' | 'danger';

// Fill and border only. Every button in the design has its own size, so the
// caller passes that through className rather than picking from a size prop.
const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-surface hover:bg-brand-dark',
    outline: 'border border-brand bg-white text-ink hover:bg-brand/10',
    danger: 'bg-danger text-surface hover:bg-danger-hover-2',
};

type ButtonProps = {
    variant?: ButtonVariant;
    // While true the button is disabled, announces itself busy, and shows
    // loadingLabel instead of its children. The component this replaced
    // hardcoded 'Logging in…', which is why it could only ever be a login
    // button.
    isLoading?: boolean;
    loadingLabel?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
    variant = 'primary',
    className = '',
    isLoading = false,
    loadingLabel,
    disabled,
    children,
    // Buttons inside a <form> submit by default; only the one that means it
    // should say so.
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            aria-busy={isLoading || undefined}
            className={`rounded-button transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        >
            {isLoading && loadingLabel ? loadingLabel : children}
        </button>
    );
}
