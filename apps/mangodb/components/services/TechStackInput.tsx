'use client';

import { useState } from 'react';
import FieldError from '@/components/ui/FieldError';

type TechStackInputProps = {
    value: string[];
    onChange: (techStack: string[]) => void;
    error?: string | undefined;
    // A problem with what was just typed, or null once it is fixed.
    onError: (message: string | null) => void;
};

// The same limits as the API's techStack: 20 names of up to 100 characters.
const MAX_ITEMS = 20;
const MAX_LENGTH = 100;

// Tech names as chips inside one box. Enter adds what was typed, Backspace on
// an empty box takes the last chip off.
export default function TechStackInput({
    value,
    onChange,
    error,
    onError,
}: TechStackInputProps) {
    const [text, setText] = useState('');

    const add = () => {
        const name = text.trim();
        if (!name) return;

        if (name.length > MAX_LENGTH) {
            onError('Tech stack item cannot exceed 100 characters.');
            return;
        }
        if (value.length >= MAX_ITEMS) {
            onError('You can select at most 20 tech stack items.');
            return;
        }
        if (value.some((item) => item.toLowerCase() === name.toLowerCase())) {
            onError('This tech stack item is already added.');
            return;
        }

        onError(null);
        onChange([...value, name]);
        setText('');
    };

    const remove = (name: string) => {
        onError(null);
        onChange(value.filter((item) => item !== name));
    };

    return (
        <div>
            <label
                htmlFor="tech-stack-input"
                className="block type-sm font-semibold mb-1 text-ink"
            >
                Tech stack*
            </label>

            <div
                className={`w-full min-h-[42px] p-2 rounded-input border flex flex-wrap items-center gap-1.5 focus-within:ring-1 ${
                    error
                        ? 'border-danger focus-within:border-danger focus-within:ring-danger'
                        : 'border-line focus-within:border-brand focus-within:ring-brand'
                }`}
            >
                {value.map((name) => (
                    <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-status type-xs font-medium bg-brand text-surface-white"
                    >
                        {name}
                        <button
                            type="button"
                            onClick={() => remove(name)}
                            aria-label={`Remove ${name}`}
                            className="hover:opacity-75 focus:outline-none ml-0.5"
                        >
                            ✕
                        </button>
                    </span>
                ))}

                <input
                    id="tech-stack-input"
                    type="text"
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        onError(null);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            add();
                        } else if (event.key === 'Backspace' && !text) {
                            const last = value[value.length - 1];
                            if (last) remove(last);
                        }
                    }}
                    placeholder={
                        value.length === 0
                            ? 'Type technology and press Enter...'
                            : ''
                    }
                    className="flex-1 min-w-[120px] bg-transparent type-sm placeholder:text-ink-placeholder focus:outline-none px-1"
                />
            </div>

            <FieldError message={error} />
        </div>
    );
}
