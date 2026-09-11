'use client';

import { useId, useState } from 'react';
import type { ServicePortfolio } from '@mangodb/shared';
import FileUpload from '@/components/sm-detail/FileUpload';
import { ApiRequestError } from '@/lib/api';
import { updatePortfolio } from '@/lib/portfolios';

type EditPortfolioFormProps = {
    portfolio: ServicePortfolio;
    onClose: () => void;
    onSave: (portfolio: ServicePortfolio) => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function errorMessage(error: unknown): string {
    if (!(error instanceof ApiRequestError)) {
        return 'Unable to connect to the server.';
    }

    return error.details[0]?.message ?? error.message;
}

export default function EditPortfolioForm({
    portfolio,
    onClose,
    onSave,
}: EditPortfolioFormProps) {
    const titleId = useId();
    const [initialYear, initialMonth, initialDay] =
        portfolio.development_date.split('-');
    const [name, setName] = useState(portfolio.portfolio_name);
    const [description, setDescription] = useState(
        portfolio.portfolio_description ?? '',
    );
    const [link, setLink] = useState(portfolio.portfolio_link);
    const [day, setDay] = useState(String(Number(initialDay) || ''));
    const [month, setMonth] = useState(String(Number(initialMonth) || ''));
    const [year, setYear] = useState(initialYear ?? '');
    const [image, setImage] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const currentYear = new Date().getFullYear();
    const latestYear = Math.max(
        Number(initialYear) || currentYear,
        currentYear,
    );
    const earliestYear = Math.min(Number(initialYear) || currentYear, 1950);
    const years = Array.from(
        { length: latestYear - earliestYear + 1 },
        (_, index) => latestYear - index,
    );
    const dayCount =
        Number(year) > 0 && Number(month) > 0
            ? new Date(Number(year), Number(month), 0).getDate()
            : 31;
    const days = Array.from({ length: dayCount }, (_, index) => index + 1);

    const handleImageChange = (file: File | null) => {
        setError(null);

        if (file && !IMAGE_TYPES.has(file.type)) {
            setImage(null);
            setError('Only PNG, JPEG or WebP images are allowed.');
            return;
        }
        if (file && file.size > MAX_IMAGE_BYTES) {
            setImage(null);
            setError('Image must be 5MB or smaller.');
            return;
        }

        setImage(file);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (Number(day) > dayCount) {
            setError('Choose a valid development date.');
            return;
        }

        const developmentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const body = new FormData();
        body.append('portfolio_name', name);
        body.append('portfolio_description', description);
        body.append('portfolio_link', link);
        body.append('development_date', developmentDate);
        if (image) {
            body.append('portfolio_image', image);
        }

        setIsSaving(true);
        try {
            const updated = await updatePortfolio(portfolio.portfolio_id, body);
            onSave(updated);
            onClose();
        } catch (submitError) {
            setError(errorMessage(submitError));
        } finally {
            setIsSaving(false);
        }
    };

    const selectClassName =
        'h-[4.89vh] w-full rounded-input border border-[#3F6B80] bg-[#FFFFFF]/80 px-1.5 text-sm text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#497B93]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="modal-scrollbar h-[92vh] w-full max-w-[45vw] overflow-y-auto rounded-xl bg-[#FFFDF9] p-[1.5vw] text-[#171717] shadow-xl max-md:h-[90vh]"
            >
                <header className="flex items-center justify-between">
                    <h2 id={titleId} className="text-lg">
                        Edit Portfolio
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="Close edit portfolio"
                        className="text-[#828282] hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        X
                    </button>
                </header>

                <hr className="border-[#3F6B80]/50" />
                <p className="my-2 text-xs">*Indicates required</p>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <div>
                            <label
                                className="block text-sm"
                                htmlFor="portfolio-name"
                            >
                                Name*
                            </label>
                            <input
                                id="portfolio-name"
                                type="text"
                                required
                                maxLength={255}
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                className="h-[4.07vh] w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 px-1.5 text-sm text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                            />
                        </div>

                        <div>
                            <label
                                className="block text-sm"
                                htmlFor="portfolio-description"
                            >
                                Description
                            </label>
                            <textarea
                                id="portfolio-description"
                                maxLength={2000}
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                className="h-[9.65vh] w-full resize-none rounded-input border border-[#497B93] bg-[#FFFFFF]/80 px-1.5 py-1.5 text-sm text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                            />
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium"
                                htmlFor="portfolio-link"
                            >
                                Link to your portfolio*
                            </label>
                            <input
                                id="portfolio-link"
                                type="url"
                                required
                                maxLength={255}
                                value={link}
                                onChange={(event) =>
                                    setLink(event.target.value)
                                }
                                className="h-[4.07vh] w-full rounded-input border border-[#497B93] bg-[#FFFFFF]/80 px-1.5 text-sm text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#497B93]"
                            />
                        </div>

                        <fieldset>
                            <legend className="text-sm !font-[500]">
                                Development date
                            </legend>
                            <div className="flex gap-2 max-sm:flex-col">
                                <label className="min-w-0 flex-1 text-sm">
                                    Date
                                    <select
                                        required
                                        value={day}
                                        onChange={(event) =>
                                            setDay(event.target.value)
                                        }
                                        className={selectClassName}
                                    >
                                        {days.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="min-w-0 flex-1 text-sm">
                                    Month
                                    <select
                                        required
                                        value={month}
                                        onChange={(event) =>
                                            setMonth(event.target.value)
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
                                <label className="min-w-0 flex-1 text-sm">
                                    Year
                                    <select
                                        required
                                        value={year}
                                        onChange={(event) =>
                                            setYear(event.target.value)
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
                        </fieldset>

                        <FileUpload
                            value={image}
                            onChange={handleImageChange}
                            accept="image/png,image/jpeg,image/webp"
                            label="Upload Image"
                            className="upload-box mx-auto my-8 flex h-[20.64vh] w-[14.11vw] cursor-pointer flex-col items-center justify-center rounded-lg bg-[#E3F1F1]/40 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#497B93]"
                        />

                        {error && (
                            <p role="alert" className="text-sm text-[#C5483E]">
                                {error}
                            </p>
                        )}
                    </div>

                    <hr className="border-[#3F6B80]/50" />
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="h-[4vh] w-[7vw] rounded-status bg-[#3F6B80] text-sm font-[500] text-[#FFFDF9] transition-colors hover:bg-[#497B93] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
