'use client';

import { useId, useState, useCallback } from 'react';
import FieldError from '@/components/ui/FieldError';
import ModalShell from '@/components/ui/ModalShell';
import FileUpload from '@/components/sm-detail/FileUpload';

export interface PendingPortfolio {
    id: string;
    name: string;
    description: string;
    link: string;
    developmentDate: string;
    image: File | null;
}

type Errors = Partial<
    Record<
        'name' | 'description' | 'link' | 'developmentDate' | 'image',
        string
    >
>;

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: PendingPortfolio) => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function daysInMonth(year: string, month: string): number {
    const numericYear = Number(year);
    const numericMonth = Number(month);

    return numericYear > 0 && numericMonth > 0
        ? new Date(numericYear, numericMonth, 0).getDate()
        : 31;
}

function getTodayParts() {
    const now = new Date();
    return {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1),
        day: String(now.getDate()),
    };
}

export default function AddPortfolioModal({ isOpen, onClose, onAdd }: Props) {
    const titleId = useId();
    const todayParts = getTodayParts();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [day, setDay] = useState(todayParts.day);
    const [month, setMonth] = useState(todayParts.month);
    const [year, setYear] = useState(todayParts.year);
    const [image, setImage] = useState<File | null>(null);
    const [errors, setErrors] = useState<Errors>({});

    const clearError = (field: keyof Errors) =>
        setErrors((prev) => ({ ...prev, [field]: undefined }));

    const reset = () => {
        const freshToday = getTodayParts();
        setName('');
        setDescription('');
        setLink('');
        setDay(freshToday.day);
        setMonth(freshToday.month);
        setYear(freshToday.year);
        setImage(null);
        setErrors({});
    };

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [onClose]);

    // Year options calculation
    const currentYear = new Date().getFullYear();
    const years = Array.from(
        { length: currentYear - 1950 + 1 },
        (_, index) => currentYear - index,
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

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const next: Errors = {};

        if (!name.trim()) next.name = 'Name is required.';
        if (!link.trim()) next.link = 'Portfolio link is required.';
        else if (!/^https?:\/\//i.test(link))
            next.link = 'Must be a valid URL starting with http(s)://';

        if (!day || !month || !year || Number(day) > dayCount) {
            next.developmentDate = 'Choose a valid development date.';
        }

        if (!image) next.image = 'Image is required.';

        if (Object.keys(next).length) {
            setErrors(next);
            return;
        }

        const developmentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        onAdd({
            id: crypto.randomUUID(),
            name: name.trim(),
            description: description.trim(),
            link: link.trim(),
            developmentDate,
            image,
        });

        reset();
        onClose();
    };

    const selectClassName =
        'h-[4.89vh] w-full rounded-input border border-brand-dark bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand';

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={handleClose}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            panelClassName="modal-scrollbar h-[92vh] w-full max-w-[45vw] overflow-y-auto rounded-xl bg-surface p-[1.5vw] text-ink shadow-xl max-md:h-[90vh]"
        >
            <header className="flex items-center justify-between">
                <h2 id={titleId} className="type-lg">
                    Add Portfolio
                </h2>
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close add portfolio"
                    className="text-ink-placeholder hover:text-gray-800"
                >
                    X
                </button>
            </header>

            <hr className="border-brand-dark/50" />
            <p className="my-2 type-xs">*Indicates required</p>

            <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                    {/* Name */}
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
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError message={errors.name} />
                    </div>

                    {/* Description */}
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

                    {/* Link */}
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
                            className="h-[4.07vh] w-full rounded-input border border-brand bg-surface-white/80 px-1.5 type-sm text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <FieldError message={errors.link} />
                    </div>

                    {/* Development Date Selectors */}
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

                    {/* Image Upload */}
                    <FileUpload
                        value={image}
                        onChange={handleImageChange}
                        accept="image/png,image/jpeg,image/webp"
                        label="Upload Image"
                        className="upload-box mx-auto my-8 flex h-[20.64vh] w-[14.11vw] cursor-pointer flex-col items-center justify-center rounded-lg bg-brand-mist/40 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    />
                    <FieldError message={errors.image} />
                </div>

                <hr className="border-brand-dark/50" />
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="submit"
                        className="h-[4vh] w-[7vw] rounded-status bg-brand-dark type-sm font-[500] text-surface transition-colors hover:bg-brand"
                    >
                        Add
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
