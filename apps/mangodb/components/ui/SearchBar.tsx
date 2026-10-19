'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

type SearchBarProps = {
    // Gets the trimmed keyword once typing pauses, or at once on Enter or
    // clear. The page keeps only that, and resets its paging there.
    onSearch: (q: string) => void;
    // Names the box for screen readers, e.g. "Search jobs by keyword".
    label: string;
    placeholder?: string;
    // The width. The look is the same everywhere.
    className?: string;
};

// Long enough to skip the keystrokes in a word, short enough to feel live.
const DELAY_MS = 300;

// The keyword box on every list page: search icon, the text, a clear button.
export default function SearchBar({
    onSearch,
    label,
    placeholder = 'Search',
    className = 'w-full sm:w-[27.86vw]',
}: SearchBarProps) {
    const [text, setText] = useState('');
    // The last keyword sent, so the same one is never sent twice.
    const sentRef = useRef('');
    const onSearchRef = useRef(onSearch);

    useEffect(() => {
        onSearchRef.current = onSearch;
    });

    const send = (value: string) => {
        const q = value.trim();
        if (q === sentRef.current) return;
        sentRef.current = q;
        onSearchRef.current(q);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const q = text.trim();
            if (q === sentRef.current) return;
            sentRef.current = q;
            onSearchRef.current(q);
        }, DELAY_MS);
        return () => clearTimeout(timer);
    }, [text]);

    return (
        <div className={`relative h-[4.07vh] min-w-[180px] ${className}`}>
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-[0.6vw] top-1/2 h-[2vh] w-[2vw] -translate-y-1/2 text-ink-placeholder"
            />
            <input
                type="text"
                role="searchbox"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                    // No form around it, so Enter searches here.
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        send(text);
                    }
                }}
                maxLength={100}
                placeholder={placeholder}
                aria-label={label}
                className="h-full w-full rounded-[50px] border border-line bg-surface-white pl-[3vw] pr-[3vw] type-sm text-ink placeholder:text-ink-placeholder focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            />
            {text && (
                <button
                    type="button"
                    onClick={() => {
                        setText('');
                        send('');
                    }}
                    aria-label="Clear search"
                    className="absolute right-[1vw] top-1/2 -translate-y-1/2 rounded-full p-[0.16vw] type-sm text-ink-placeholder hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                    <X aria-hidden="true" className="h-[1.48vh] w-[0.73vw]" />
                </button>
            )}
        </div>
    );
}
