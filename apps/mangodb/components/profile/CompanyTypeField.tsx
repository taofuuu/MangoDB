'use client';

import { useState } from 'react';
import Tag from '../ui/Tag';
import FieldError from '../ui/FieldError';
import { PREDEFINED_COMPANY_TYPES } from '@/lib/validation/company';

type CompanyTypeFieldProps = {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    error?: string | undefined;
};

// The tags box from the design: chips wrap inside a bordered area, and the
// trailing "+" turns into an inline field with predefined suggestions so a
// tag can be added cleanly without a dialog.
export default function CompanyTypeField({
    label,
    value,
    onChange,
    error,
}: CompanyTypeFieldProps) {
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');

    const commit = () => {
        const tag = draft.trim();
        const taken = value.some(
            (existing) => existing.toLowerCase() === tag.toLowerCase(),
        );

        if (tag && !taken && tag.length <= 100 && value.length < 10) {
            onChange([...value, tag]);
        }

        setDraft('');
        setAdding(false);
    };

    const remove = (tag: string) => {
        onChange(value.filter((existing) => existing !== tag));
    };

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="mb-1.5 block type-sm !font-[600] text-ink">
                {label}
            </span>

            <div
                className={`flex min-h-[76px] max-h-[105px] w-full flex-wrap content-start gap-1.5 overflow-y-auto rounded-input border bg-surface-white p-2.5 transition-colors focus-within:ring-1 ${
                    error
                        ? 'border-danger focus-within:border-danger focus-within:ring-danger'
                        : 'border-line focus-within:border-brand focus-within:ring-brand'
                }`}
            >
                {value.map((tag) => (
                    <Tag
                        key={tag}
                        label={tag}
                        size="sm"
                        onRemove={() => remove(tag)}
                        className="bg-fill-muted text-ink"
                    />
                ))}

                {adding ? (
                    <>
                        <input
                            autoFocus
                            list="predefined-company-types"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commit();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setDraft('');
                                    setAdding(false);
                                }
                            }}
                            placeholder="Company type"
                            aria-label="New company type"
                            className="h-6 min-w-[110px] rounded-status bg-fill-muted px-2.5 type-xs text-ink placeholder:text-ink-placeholder focus:outline-none"
                        />
                        <datalist id="predefined-company-types">
                            {PREDEFINED_COMPANY_TYPES.map((type) => (
                                <option key={type} value={type} />
                            ))}
                        </datalist>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        aria-label="Add company type"
                        className="h-6 px-2.5 cursor-pointer rounded-status bg-fill-muted type-xs text-ink hover:bg-line"
                    >
                        +
                    </button>
                )}
            </div>

            <FieldError message={error} />
        </div>
    );
}
