'use client';

type InputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    // Filled in by the "Validate required profile fields and formats" task.
    // The slot lives here so adding a rule never has to touch this file.
    error?: string;
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
        <div>
            <label
                htmlFor={inputId}
                className="mb-[0.93vh] block text-lg leading-[1.15]"
            >
                {label}
            </label>

            <input
                id={inputId}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-[4.79vh] w-full rounded-button border-[0.75px] border-black bg-white px-[0.83vw] text-md text-[#171717] placeholder:text-[#D6D6D6] focus:ring-1 focus:ring-[#497B93] focus:outline-none"
                {...props}
            />

            {error && (
                <p className="mt-[0.46vh] text-sm text-[#C5483B]">{error}</p>
            )}
        </div>
    );
}
