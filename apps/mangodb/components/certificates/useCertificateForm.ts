'use client';

import { type FormEvent, useState } from 'react';
import type { Certificate } from '@mangodb/shared';
import type { CertificateFormProps } from './CertificateForm';
import { createCertificate, updateCertificate } from '@/lib/certificates';
import { type FieldErrors, toFormErrors } from '@/lib/validation/formErrors';

// What the inputs hold. Months and years are the dropdowns' text values.
type CertificateValues = {
    name: string;
    organization: string;
    issueMonth: string;
    issueYear: string;
    expireMonth: string;
    expireYear: string;
    credentialId: string;
    credentialUrl: string;
    image: File | null;
};

// Which input on this form each API field belongs under. Month and year share
// one message because they sit on one row and are wrong together.
const CERTIFICATE_FIELDS = {
    certTitle: 'name',
    organization: 'organization',
    issueMonth: 'issueDate',
    issueYear: 'issueDate',
    expireMonth: 'expireDate',
    expireYear: 'expireDate',
    credentialId: 'credentialId',
    credentialUrl: 'credentialUrl',
    certImage: 'image',
} as const;

type CertificateErrors = FieldErrors<
    (typeof CERTIFICATE_FIELDS)[keyof typeof CERTIFICATE_FIELDS]
>;

// The message a field's error sits under: a month or a year shares its date's.
function errorKey(field: keyof CertificateValues): keyof CertificateErrors {
    if (field === 'issueMonth' || field === 'issueYear') return 'issueDate';
    if (field === 'expireMonth' || field === 'expireYear') return 'expireDate';
    return field;
}

const text = (value: number | string | null | undefined) =>
    value == null ? '' : String(value);

// Blank for a new certificate, or the saved one's values for an edit.
function toValues(certificate: Certificate | undefined): CertificateValues {
    return {
        name: certificate?.certTitle ?? '',
        organization: certificate?.organization ?? '',
        issueMonth: text(certificate?.issueMonth),
        issueYear: text(certificate?.issueYear),
        expireMonth: text(certificate?.expireMonth),
        expireYear: text(certificate?.expireYear),
        credentialId: certificate?.credentialId ?? '',
        credentialUrl: certificate?.credentialUrl ?? '',
        image: null,
    };
}

// The API checks this too; here it saves a round trip.
function validate(values: CertificateValues): CertificateErrors {
    const { issueMonth, issueYear, expireMonth, expireYear } = values;
    if (issueYear && issueMonth && expireYear && expireMonth) {
        const issued = Number(issueYear) * 100 + Number(issueMonth);
        const expires = Number(expireYear) * 100 + Number(expireMonth);
        if (expires < issued) {
            return {
                expireDate: 'Expiration date cannot be before the issue date.',
            };
        }
    }
    return {};
}

function toFormData(values: CertificateValues, isEditing: boolean): FormData {
    const body = new FormData();
    body.append('certTitle', values.name);
    body.append('organization', values.organization);
    const optional = {
        issueMonth: values.issueMonth,
        issueYear: values.issueYear,
        expireMonth: values.expireMonth,
        expireYear: values.expireYear,
        credentialId: values.credentialId,
        credentialUrl: values.credentialUrl,
    };
    for (const [field, value] of Object.entries(optional)) {
        // An edit sends blanks too: the API reads '' as null, which is
        // the only way to clear a field that already has a value.
        if (isEditing || value) body.append(field, value);
    }
    // Without a new file, an edit keeps the saved image.
    if (values.image) body.append('certImage', values.image);
    return body;
}

// Everything CertificateForm does besides drawing: the values, their errors,
// and the save, which ends by handing the saved row to onSave and closing.
export function useCertificateForm({
    certificate,
    onSave,
    onClose,
}: CertificateFormProps) {
    const [values, setValues] = useState(() => toValues(certificate));
    const [errors, setErrors] = useState<CertificateErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Changing a field also clears that field's error, so a field the user
    // has already fixed stops looking broken.
    function setField<Field extends keyof CertificateValues>(
        field: Field,
        value: CertificateValues[Field],
    ) {
        setValues((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [errorKey(field)]: undefined }));
    }

    // For an input that checks itself, like the file picker.
    function setFieldError(field: keyof CertificateErrors, message: string) {
        setErrors((prev) => ({ ...prev, [field]: message }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const newErrors = validate(values);
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const body = toFormData(values, certificate !== undefined);

        setIsSubmitting(true);
        try {
            const saved = certificate
                ? await updateCertificate(certificate.certificateId, body)
                : await createCertificate(body);
            onSave(saved);
            onClose();
        } catch (cause: unknown) {
            const { fields, message } = toFormErrors(cause, CERTIFICATE_FIELDS);
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        values,
        setField,
        setFieldError,
        errors,
        formError,
        isSubmitting,
        isEditing: certificate !== undefined,
        handleSubmit,
    };
}
