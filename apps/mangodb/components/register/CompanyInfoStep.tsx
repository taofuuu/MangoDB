'use client';

import type { ChangeEvent, FormEvent } from 'react';

export type CompanyInfo = {
    company_name: string;
    company_description: string;
    company_type: string[];
    phone: string;
    email: string;
    address: string;
    website: string;
};

type Availability = {
    emailAvailable: boolean | null;
};

type CompanyInfoStepProps = {
    value: CompanyInfo;
    onChange: (next: CompanyInfo) => void;
    availability: Availability;
    onBack: () => void;
    onNext: () => void;
};

export default function CompanyInfoStep({
    value,
    onChange,
    availability,
    onBack,
    onNext,
}: CompanyInfoStepProps) {
    const update = (field: keyof CompanyInfo, nextValue: string | string[]) => {
        onChange({ ...value, [field]: nextValue });
    };

    const addCompanyType = () => {
        if (value.company_type.length >= 10) return;
        update('company_type', [...value.company_type, '']);
    };

    const changeCompanyType = (index: number, nextValue: string) => {
        const next = [...value.company_type];
        next[index] = nextValue;
        update('company_type', next);
    };

    const removeCompanyType = (index: number) => {
        update(
            'company_type',
            value.company_type.filter(
                (_, currentIndex) => currentIndex !== index,
            ),
        );
    };

    const handleChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value: nextValue } = event.target;
        update(name as keyof CompanyInfo, nextValue);
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onNext();
    };

    const companyTypeValid =
        value.company_type.length > 0 &&
        value.company_type.every((item) => item.trim().length > 0);
    const requiredValid = Boolean(
        value.company_name.trim() &&
        value.phone.trim() &&
        value.email.trim() &&
        companyTypeValid &&
        availability.emailAvailable !== false,
    );

    return (
        <form
            onSubmit={submit}
            className="flex min-h-[720px] flex-col px-7 py-9 sm:px-10 lg:min-h-[800px] lg:px-12 lg:py-12"
        >
            <header>
                <h1 className="text-[38px] font-bold leading-none sm:text-[44px]">
                    Sign Up
                </h1>
                <h2 className="mt-1 text-[28px] font-semibold leading-tight sm:text-[32px]">
                    Company Information
                </h2>
                <div className="mt-5 h-px bg-[#497B93]" />
            </header>

            <div className="custom-scrollbar mt-7 min-h-0 flex-1 overflow-y-auto pr-2">
                <div className="space-y-5 pb-3">
                    <Field
                        label="Company Name"
                        name="company_name"
                        value={value.company_name}
                        onChange={handleChange}
                        required
                    />

                    <div>
                        <label className="mb-2 block text-base font-normal">
                            Company Description
                        </label>
                        <textarea
                            name="company_description"
                            value={value.company_description}
                            onChange={handleChange}
                            maxLength={2000}
                            className="min-h-44 w-full resize-none rounded-md border border-[#497B93] bg-white/50 px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-[#66A6C5]"
                        />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="block text-base font-normal">
                                Company Type
                            </label>
                            <span className="text-xs text-[#497B93]">
                                {value.company_type.length}/10
                            </span>
                        </div>

                        <div className="space-y-2">
                            {value.company_type.map((type, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        value={type}
                                        onChange={(event) =>
                                            changeCompanyType(
                                                index,
                                                event.target.value,
                                            )
                                        }
                                        maxLength={100}
                                        placeholder="e.g. Software House"
                                        className="w-full rounded-md border border-[#497B93] bg-white/50 px-4 py-2.5 outline-none transition focus:ring-2 focus:ring-[#66A6C5]"
                                    />
                                    {value.company_type.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeCompanyType(index)
                                            }
                                            className="rounded-md border border-[#497B93] px-3 text-lg hover:bg-white"
                                            aria-label={`Remove company type ${index + 1}`}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addCompanyType}
                            disabled={value.company_type.length >= 10}
                            className="mt-2 flex h-9 items-center gap-2 rounded-full bg-[#D9D9D9] px-4 text-base disabled:opacity-50"
                        >
                            + Add type
                        </button>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
                        <Field
                            label="Phone Number"
                            name="phone"
                            value={value.phone}
                            onChange={handleChange}
                            required
                            inputMode="tel"
                        />
                        <div>
                            <Field
                                label="Email"
                                name="email"
                                value={value.email}
                                onChange={handleChange}
                                required
                                type="email"
                            />
                            {availability.emailAvailable === false && (
                                <ErrorText>
                                    † Email already registered. Please use
                                    another email.
                                </ErrorText>
                            )}
                        </div>
                    </div>

                    <Field
                        label="Address"
                        name="address"
                        value={value.address}
                        onChange={handleChange}
                    />
                    <Field
                        label="Website"
                        name="website"
                        value={value.website}
                        onChange={handleChange}
                        type="url"
                        placeholder="https://example.com"
                    />
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-[20px] border border-[#497B93] px-7 py-2 text-base font-semibold text-[#497B93] hover:bg-[#497B93]/10"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={!requiredValid}
                    className="rounded-[20px] bg-[#497B93] px-8 py-2 text-lg font-bold text-white shadow-[2px_4px_4px_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </form>
    );
}

function Field({
    label,
    name,
    value,
    onChange,
    required,
    type = 'text',
    placeholder,
    inputMode,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    type?: string;
    placeholder?: string;
    inputMode?: 'text' | 'tel' | 'url' | 'email' | 'numeric';
}) {
    return (
        <div>
            <label htmlFor={name} className="mb-2 block text-base font-normal">
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                inputMode={inputMode}
                className="h-[46px] w-full rounded-md border border-[#497B93] bg-white/50 px-4 outline-none transition focus:ring-2 focus:ring-[#66A6C5]"
            />
        </div>
    );
}

function ErrorText({ children }: { children: string }) {
    return <p className="mt-1 text-xs text-[#C5483B]">{children}</p>;
}
