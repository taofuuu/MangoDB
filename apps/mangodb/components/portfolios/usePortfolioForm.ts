'use client';

import { type FormEvent, useState } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import { updatePortfolio } from '@/lib/portfolios';
import { type FieldErrors, toFormErrors } from '@/lib/validation/formErrors';
import { type DateParts, daysInMonth } from './DevelopmentDateFields';
import type { PortfolioFormProps } from './PortfolioForm';

// What the inputs hold.
type PortfolioValues = {
    name: string;
    description: string;
    link: string;
    developmentDate: DateParts;
    image: File | null;
};

type PortfolioErrors = FieldErrors<keyof PortfolioValues>;

// API field name → the form's name for it, for errors the API sends back.
const PORTFOLIO_FIELDS = {
    portfolioName: 'name',
    portfolioDescription: 'description',
    portfolioLink: 'link',
    developmentDate: 'developmentDate',
    portfolioImage: 'image',
} as const;

// The date to start from: the saved one when editing, today when adding.
function startingDate(portfolio: ServicePortfolio | null): DateParts {
    if (portfolio) {
        const [year = '', month, day] = portfolio.developmentDate.split('-');
        return {
            year,
            month: String(Number(month) || ''),
            day: String(Number(day) || ''),
        };
    }
    const now = new Date();
    return {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1),
        day: String(now.getDate()),
    };
}

function toValues(portfolio: ServicePortfolio | null): PortfolioValues {
    return {
        name: portfolio?.portfolioName ?? '',
        description: portfolio?.portfolioDescription ?? '',
        link: portfolio?.portfolioLink ?? '',
        developmentDate: startingDate(portfolio),
        image: null,
    };
}

// What can be checked without the API. A new portfolio needs its image;
// an edited one keeps the saved image unless a new one is chosen.
function validate(values: PortfolioValues, isAdding: boolean): PortfolioErrors {
    const errors: PortfolioErrors = {};
    if (!values.name.trim()) errors.name = 'Name is required.';
    if (!values.link.trim()) errors.link = 'Portfolio link is required.';
    else if (!/^https?:\/\//i.test(values.link.trim())) {
        errors.link = 'Must be a valid URL starting with http(s)://';
    }
    const { year, month, day } = values.developmentDate;
    if (!day || !month || !year || Number(day) > daysInMonth(year, month)) {
        errors.developmentDate = 'Choose a valid development date.';
    }
    if (isAdding && !values.image) errors.image = 'Image is required.';
    return errors;
}

// YYYY-MM-DD, the way the API takes a date.
function toDateText({ year, month, day }: DateParts): string {
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Everything PortfolioForm does besides drawing: the values, their errors,
// and the save. Adding hands the new portfolio to onAdd, since ServiceForm
// uploads it with the service; editing saves it and hands it to onSave.
// Either way the form then closes.
export function usePortfolioForm(props: PortfolioFormProps) {
    const portfolio = props.mode === 'edit' ? props.portfolio : null;
    const [values, setValues] = useState(() => toValues(portfolio));
    const [errors, setErrors] = useState<PortfolioErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Changing a field also clears that field's error, so a field the user
    // has already fixed stops looking broken.
    function setField<Field extends keyof PortfolioValues>(
        field: Field,
        value: PortfolioValues[Field],
    ) {
        setValues((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // For an input that checks itself, like the file picker.
    function setFieldError(field: keyof PortfolioValues, message: string) {
        setErrors((prev) => ({ ...prev, [field]: message }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const newErrors = validate(values, props.mode === 'add');
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const developmentDate = toDateText(values.developmentDate);

        if (props.mode === 'add') {
            props.onAdd({
                id: crypto.randomUUID(),
                name: values.name.trim(),
                description: values.description.trim(),
                link: values.link.trim(),
                developmentDate,
                image: values.image,
            });
            props.onClose();
            return;
        }

        const body = new FormData();
        body.append('portfolioName', values.name);
        body.append('portfolioDescription', values.description);
        body.append('portfolioLink', values.link);
        body.append('developmentDate', developmentDate);
        if (values.image) body.append('portfolioImage', values.image);

        setIsSaving(true);
        try {
            const updated = await updatePortfolio(
                props.portfolio.portfolioId,
                body,
            );
            props.onSave(updated);
            props.onClose();
        } catch (cause: unknown) {
            const { fields, message } = toFormErrors(cause, PORTFOLIO_FIELDS);
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsSaving(false);
        }
    }

    return {
        values,
        setField,
        setFieldError,
        errors,
        formError,
        isSaving,
        isEditing: portfolio !== null,
        handleSubmit,
    };
}
