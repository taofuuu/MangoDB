'use client';

import Textarea from '../ui/Textarea';

type TermsField = 'serviceTerm' | 'warrantyPolicy';

type ProviderTermsFieldsProps = {
    serviceTerm: string | null;
    warrantyPolicy: string | null;
    onChange: (field: TermsField, value: string) => void;
    errors: Partial<Record<TermsField, string>>;
};

// The profile fields only a provider has. Both live on the provider table, so
// CompanyProfileForm shows them only to a PROVIDER or BOTH company.
export default function ProviderTermsFields({
    serviceTerm,
    warrantyPolicy,
    onChange,
    errors,
}: ProviderTermsFieldsProps) {
    return (
        <>
            <div className="mt-[3.09vh]">
                <Textarea
                    label="Service Terms"
                    value={serviceTerm ?? ''}
                    onChange={(value) => onChange('serviceTerm', value)}
                    error={errors.serviceTerm}
                    maxLength={2000}
                />
            </div>

            <div className="mt-[3.09vh]">
                <Textarea
                    label="Company Warranty Policy"
                    value={warrantyPolicy ?? ''}
                    onChange={(value) => onChange('warrantyPolicy', value)}
                    error={errors.warrantyPolicy}
                    maxLength={2000}
                />
            </div>
        </>
    );
}
