'use client';

import { useState } from 'react';
import Tag from '../ui/Tag';
import { PREDEFINED_COMPANY_TYPES } from '@/lib/validation';

type CompanyTypeFieldProps = {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    error?: string;
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
        <div>
            <span className="mb-[0.93vh] block text-lg leading-[1.15]">
                {label}
            </span>

            <div className="custom-scrollbar flex h-[13.36vh] w-full flex-wrap content-start gap-x-[1.68vw] gap-y-[2.41vh] overflow-y-auto rounded-button border-[0.75px] border-black bg-white px-[0.97vw] py-[2vh]">
                {value.map((tag) => (
                    <Tag
                        key={tag}
                        label={tag}
                        onRemove={() => remove(tag)}
                        className="bg-[#D9D9D9] text-[#171717]"
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
                                    setDraft('');
                                    setAdding(false);
                                }
                            }}
                            placeholder="Company type"
                            aria-label="New company type"
                            className="h-[3.33vh] w-[12.89vw] rounded-status bg-[#D9D9D9] px-[0.94vw] text-md text-[#171717] placeholder:text-[#8A8A8A] focus:outline-none"
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
                        className="h-[3.33vh] cursor-pointer rounded-status bg-[#D9D9D9] px-[1.15vw] text-md text-[#171717] hover:bg-[#CCCCCC]"
                    >
                        +
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-[0.46vh] text-sm text-[#C5483B]">{error}</p>
            )}
        </div>
    );
}
