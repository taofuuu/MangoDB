'use client';

import { useId, useState } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import FileUpload from '@/components/ui/FileUpload';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';
import { updatePortfolio } from '@/lib/portfolios';
import { toFormErrors, type FieldErrors } from '@/lib/validation/formErrors';

// A portfolio added to a service that is not saved yet. ServiceForm uploads
// it once the service exists, since a portfolio needs a serviceId.
export interface PendingPortfolio {
    id: string;
    name: string;
    description: string;
    link: string;
    developmentDate: string;
    image: File | null;
}

type PortfolioFormProps = { onClose: () => void } & (
    | { mode: 'add'; onAdd: (item: PendingPortfolio) => void }
    | {
          mode: 'edit';
          portfolio: ServicePortfolio;
          onSave: (portfolio: ServicePortfolio) => void;
      }
);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Which input on this form each API field belongs under.
const PORTFOLIO_FIELDS = {
    portfolioName: 'name',
    portfolioDescription: 'description',
    portfolioLink: 'link',
    developmentDate: 'developmentDate',
    portfolioImage: 'image',
} as const;

type PortfolioErrors = FieldErrors<
    (typeof PORTFOLIO_FIELDS)[keyof typeof PORTFOLIO_FIELDS]
>;

function daysInMonth(year: string, month: string): number {
    const numericYear = Number(year);
    const numericMonth = Number(month);

    return numericYear > 0 && numericMonth > 0
        ? new Date(numericYear, numericMonth, 0).getDate()
        : 31;
}

// The date to start from: the saved one when editing, today when adding.
function startingDate(portfolio: ServicePortfolio | null) {
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

// Add a portfolio to a service, or edit a saved one. Mounted while open, so
// every opening starts from a fresh form.
export default function PortfolioForm(props: PortfolioFormProps) {
    const { onClose } = props;
    const portfolio = props.mode === 'edit' ? props.portfolio : null;
    const titleId = useId();
    const start = startingDate(portfolio);

    const [name, setName] = useState(portfolio?.portfolioName ?? '');
    const [description, setDescription] = useState(
        portfolio?.portfolioDescription ?? '',
    );
    const [link, setLink] = useState(portfolio?.portfolioLink ?? '');
    const [day, setDay] = useState(start.day);
    const [month, setMonth] = useState(start.month);
    const [year, setYear] = useState(start.year);
    const [image, setImage] = useState<File | null>(null);
    const [errors, setErrors] = useState<PortfolioErrors>({});
    // Only what no input can hold: offline, or a 500.
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Touching a box clears what was wrong with it, so a field the user has
    // already fixed stops looking broken.
    const clearError = (field: keyof PortfolioErrors) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    // Back to 1950, and forward to the saved year if it is in the future.
    const currentYear = new Date().getFullYear();
    const latestYear = Math.max(Number(start.year) || currentYear, currentYear);
    const earliestYear = Math.min(Number(start.year) || currentYear, 1950);
    const years = Array.from(
        { length: latestYear - earliestYear + 1 },
        (_, index) => latestYear - index,
    );
    const dayCount = daysInMonth(year, month);
    const days = Array.from({ length: dayCount }, (_, index) => index + 1);

    const clampDay = (nextYear: string, nextMonth: string) => {
        const nextDayCount = daysInMonth(nextYear, nextMonth);
        setDay((currentDay) =>
            String(Math.min(Number(currentDay), nextDayCount)),
        );
    };

    const handleMonthChange = (nextMonth: string) => {
        setMonth(nextMonth);
        clampDay(year, nextMonth);
        clearError('developmentDate');
    };

    const handleYearChange = (nextYear: string) => {
        setYear(nextYear);
        clampDay(nextYear, month);
        clearError('developmentDate');
    };

    const handleImageChange = (file: File | null) => {
        clearError('image');

        if (file && !IMAGE_TYPES.has(file.type)) {
            setImage(null);
            setErrors((prev) => ({
                ...prev,
                image: 'Only PNG, JPEG or WebP images are allowed.',
            }));
            return;
        }
        if (file && file.size > MAX_IMAGE_BYTES) {
            setImage(null);
            setErrors((prev) => ({
                ...prev,
                image: 'Image must be 5MB or smaller.',
            }));
            return;
        }

        setImage(file);
    };

    // What can be checked without the API. A new portfolio needs its image;
    // an edited one keeps the saved image unless a new one is chosen.
    const checkFields = (): PortfolioErrors => {
        const next: PortfolioErrors = {};
        if (!name.trim()) next.name = 'Name is required.';
        if (!link.trim()) next.link = 'Portfolio link is required.';
        else if (!/^https?:\/\//i.test(link.trim())) {
            next.link = 'Must be a valid URL starting with http(s)://';
        }
        if (!day || !month || !year || Number(day) > dayCount) {
            next.developmentDate = 'Choose a valid development date.';
        }
        if (props.mode === 'add' && !image) next.image = 'Image is required.';
        return next;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        const fieldErrors = checkFields();
        setErrors(fieldErrors);
        if (Object.keys(fieldErrors).length > 0) return;

        const developmentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        if (props.mode === 'add') {
            props.onAdd({
                id: crypto.randomUUID(),
                name: name.trim(),
                description: description.trim(),
                link: link.trim(),
                developmentDate,
                image,
            });
            onClose();
            return;
        }

        const body = new FormData();
        body.append('portfolioName', name);
        body.append('portfolioDescription', description);
        body.append('portfolioLink', link);
        body.append('developmentDate', developmentDate);
        if (image) body.append('portfolioImage', image);

        setIsSaving(true);
        try {
            const updated = await updatePortfolio(
                props.portfolio.portfolioId,
                body,
            );
            props.onSave(updated);
            onClose();
        } catch (submitError) {
            const { fields, message } = toFormErrors(
                submitError,
                PORTFOLIO_FIELDS,
            );
            setErrors(fields);
            setFormError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const title = props.mode === 'add' ? 'Add Portfolio' : 'Edit Portfolio';
    const inputClassName =
        'h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand';
    const selectClassName =
        'h-[4.89vh] w-full rounded-input border border-brand-dark bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand';

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            isBusy={isSaving}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            panelClassName="modal-scrollbar h-[92vh] w-full max-w-[45vw] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl max-md:h-[90vh]"
        >
            <header className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    aria-label={`Close ${title.toLowerCase()}`}
                    className="text-ink-placeholder hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                    X
                </button>
            </header>

            <hr className="border-brand-dark/50" />
            <p className="my-2 type-xs">*Indicates required</p>

            <form onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                    <div>
                        <label
                            className="block type-sm"
                            htmlFor="portfolio-name"
                        >
                            Name*
                        </label>
                        <input
                            id="portfolio-name"
                            type="text"
                            maxLength={255}
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                clearError('name');
                            }}
                            placeholder="Ex. E-commerce Platform Redesign"
                            className={inputClassName}
                        />
                        <FieldError message={errors.name} />
                    </div>

                    <div>
                        <label
                            className="block type-sm"
                            htmlFor="portfolio-description"
                        >
                            Description
                        </label>
                        <textarea
                            id="portfolio-description"
                            maxLength={2000}
                            value={description}
                            onChange={(event) => {
                                setDescription(event.target.value);
                                clearError('description');
                            }}
                            placeholder="Brief description of the work done..."
                            className="h-[9.65vh] w-full resize-none rounded-input border border-brand bg-surface-white/80 px-1.5 py-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError message={errors.description} />
                    </div>

                    <div>
                        <label
                            className="block type-sm font-medium"
                            htmlFor="portfolio-link"
                        >
                            Link to your portfolio*
                        </label>
                        <input
                            id="portfolio-link"
                            type="url"
                            maxLength={255}
                            value={link}
                            onChange={(event) => {
                                setLink(event.target.value);
                                clearError('link');
                            }}
                            placeholder="https://example.com/project"
                            className={inputClassName}
                        />
                        <FieldError message={errors.link} />
                    </div>

                    <fieldset>
                        <legend className="type-sm !font-[500]">
                            Development date*
                        </legend>
                        <div className="flex gap-2 max-sm:flex-col">
                            <label className="min-w-0 flex-1 type-sm">
                                Date
                                <select
                                    value={day}
                                    onChange={(event) => {
                                        setDay(event.target.value);
                                        clearError('developmentDate');
                                    }}
                                    className={selectClassName}
                                >
                                    {days.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="min-w-0 flex-1 type-sm">
                                Month
                                <select
                                    value={month}
                                    onChange={(event) =>
                                        handleMonthChange(event.target.value)
                                    }
                                    className={selectClassName}
                                >
                                    {Array.from(
                                        { length: 12 },
                                        (_, index) => index + 1,
                                    ).map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="min-w-0 flex-1 type-sm">
                                Year
                                <select
                                    value={year}
                                    onChange={(event) =>
                                        handleYearChange(event.target.value)
                                    }
                                    className={selectClassName}
                                >
                                    {years.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <FieldError message={errors.developmentDate} />
                    </fieldset>

                    <FileUpload
                        value={image}
                        onChange={handleImageChange}
                        accept="image/png,image/jpeg,image/webp"
                        label="Upload Image"
                        className="upload-box mx-auto my-8 flex h-[20.64vh] w-[14.11vw] cursor-pointer flex-col items-center justify-center rounded-lg bg-brand-mist/40 hover:bg-fill-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    />
                    <FieldError message={errors.image} />
                </div>

                <hr className="border-brand-dark/50" />
                <FieldError message={formError} />
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-[4vh] w-[7vw] rounded-status bg-brand-dark type-sm font-[500] text-surface transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {props.mode === 'add'
                            ? 'Add'
                            : isSaving
                              ? 'Saving…'
                              : 'Save'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
