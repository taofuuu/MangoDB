'use client';

type TextareaProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    // Height only — the design gives Company Location a taller box than the
    // rest, and everything else about the field is identical.
    className?: string;
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
        <div>
            <label
                htmlFor={inputId}
                className="mb-[0.93vh] block text-lg leading-[1.15]"
            >
                {label}
            </label>

            <textarea
                id={inputId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`custom-scrollbar block w-full resize-none rounded-button border-[0.75px] border-black bg-white px-[0.83vw] py-[1vh] text-md text-[#171717] placeholder:text-[#D6D6D6] focus:ring-1 focus:ring-[#497B93] focus:outline-none ${className}`}
                {...props}
            />

            {error && (
                <p className="mt-[0.46vh] text-sm text-[#C5483B]">{error}</p>
            )}
        </div>
    );
}
