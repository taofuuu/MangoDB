'use client';

type ButtonVariant = 'primary' | 'outline' | 'danger';

// Fill and border only. Every button in the design has its own size, so the
// caller passes that through className rather than picking from a size prop.
const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[#497B93] text-[#FFFDF9] hover:bg-[#3F6B80]',
    outline:
        'border border-[#497B93] bg-white text-[#171717] hover:bg-[#497B93]/10',
    danger: 'bg-[#C5483B] text-[#FFFDF9] hover:bg-[#A93B30]',
};

type ButtonProps = {
    variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
    variant = 'primary',
    className = '',
    // Buttons inside a <form> submit by default; only the one that means it
    // should say so.
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={`rounded-button transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        />
    );
}
