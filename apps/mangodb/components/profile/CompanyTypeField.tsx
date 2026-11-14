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
    variant?: 'form' | 'small';
};

const VARIANTS = {
    form: {
        container: 'flex flex-col',
        label: 'mb-[0.93vh] block type-md leading-[1.15]',
        box: 'h-[13.36vh] w-full flex-wrap content-start gap-x-[1.68vw] gap-y-[2.41vh] overflow-y-auto rounded-button border-[0.75px] bg-surface-white px-[0.97vw] py-[2vh]',
        border: 'border-ink',
        errorBorder:
            'border-danger focus-within:border-danger focus-within:ring-danger',
        input: 'h-[3.33vh] w-[12.89vw] rounded-status bg-fill-muted px-[0.94vw] type-sm text-ink placeholder:text-ink-placeholder focus:outline-none',
        button: 'h-[3.33vh] cursor-pointer rounded-status bg-fill-muted px-[1.15vw] type-sm text-ink hover:bg-line',
        tagSize: 'md' as const,
    },
    small: {
        container: 'flex min-w-0 flex-1 flex-col gap-1',
        label: 'mb-1.5 block type-sm !font-[600] text-ink',
        box: 'min-h-[76px] max-h-[105px] w-full flex-wrap content-start gap-1.5 overflow-y-auto rounded-md border bg-surface-white p-2.5 transition-colors focus-within:ring-1',
        border: 'border-line focus-within:border-brand focus-within:ring-brand',
        errorBorder:
            'border-danger focus-within:border-danger focus-within:ring-danger',
        input: 'h-6 min-w-[110px] rounded-status bg-fill-muted px-2.5 type-xs text-ink placeholder:text-ink-placeholder focus:outline-none',
        button: 'h-6 px-2.5 cursor-pointer rounded-status bg-fill-muted type-xs text-ink hover:bg-line',
        tagSize: 'sm' as const,
    },
};

// The tags box from the design: chips wrap inside a bordered area, and the
// trailing "+" turns into an inline field with predefined suggestions so a
// tag can be added cleanly without a dialog.
export default function CompanyTypeField({
    label,
    value,
    onChange,
    error,
    variant = 'form',
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

    const look = VARIANTS[variant];

    return (
        <div className={look.container}>
            <span className={look.label}>{label}</span>

            <div
                className={`flex ${look.box} ${
                    error ? look.errorBorder : look.border
                }`}
            >
                {value.map((tag) => (
                    <Tag
                        key={tag}
                        label={tag}
                        size={look.tagSize}
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
                            className={look.input}
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
                        className={look.button}
                    >
                        +
                    </button>
                )}
            </div>

            <FieldError message={error} />
        </div>
    );
}
