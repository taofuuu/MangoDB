'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import FileUpload from '@/components/ui/FileUpload';
import ModalShell from '@/components/ui/ModalShell';

type UploadQuotationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    // May throw; its message shows in the dialog and the file stays picked.
    onSubmit: (file: File) => Promise<void>;
};

// The Provider's "Submit Quotation" pop-up (US4-1), from the Figma frames
// "send a quatation", "quatation uploaded" and "quatation sent": pick a PDF,
// see its name, submit, then a success step with OK.
export default function UploadQuotationModal({
    isOpen,
    ...props
}: UploadQuotationModalProps) {
    // Unmounting on close sends a reopened dialog back to an empty picker.
    return isOpen ? <UploadQuotationFlow {...props} /> : null;
}

function UploadQuotationFlow({
    onClose,
    onSubmit,
}: Omit<UploadQuotationModalProps, 'isOpen'>) {
    const titleId = useId();
    const descriptionId = useId();
    const mountedRef = useRef(false);
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);

    // onSubmit can resolve after the dialog has gone, if the user navigates
    // away mid-upload.
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleSubmit = async () => {
        if (!file || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(file);
            if (mountedRef.current) setIsSent(true);
        } catch (cause) {
            if (mountedRef.current) {
                setError(
                    cause instanceof Error && cause.message
                        ? cause.message
                        : 'Something went wrong. Please try again.',
                );
            }
        } finally {
            if (mountedRef.current) setIsSubmitting(false);
        }
    };

    // Same panel as ConfirmDepositModal, so the project page's pop-ups match.
    const panelClassName =
        'rounded-[20px] max-h-[92vh] w-full max-w-[25vw] min-w-[300px] overflow-y-auto bg-surface text-ink px-[1.8vw] py-[2.6vh] shadow-xl max-md:max-w-[75vw] max-sm:max-w-[90vw] max-md:px-[4vw]';

    if (isSent) {
        return (
            <ModalShell
                isOpen
                onClose={onClose}
                labelledBy={titleId}
                describedBy={descriptionId}
                panelClassName={panelClassName}
            >
                <div className="flex flex-col items-center text-center">
                    <SuccessIcon />
                    <h2
                        id={titleId}
                        className="mt-[2vh] type-md text-ink !font-[500]"
                    >
                        Quotation Submitted Successfully!
                    </h2>
                    <p
                        id={descriptionId}
                        className="mt-[1.8vh] type-xs text-ink"
                    >
                        Your quotation has been submitted successfully. Waiting
                        for the receiver to review it.
                    </p>
                </div>
                <hr className="my-[2.2vh] border-line" />
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-[14px] h-[3.8vh] min-h-[34px] px-4 bg-brand type-xs text-surface !font-[600] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    OK
                </button>
            </ModalShell>
        );
    }

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            isBusy={isSubmitting}
            labelledBy={titleId}
            describedBy={descriptionId}
            panelClassName={panelClassName}
        >
            <div className="flex items-center justify-between gap-3">
                <h2 id={titleId} className="type-md text-ink !font-[600]">
                    Submit Quotation
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    aria-label="Close"
                    className="shrink-0 rounded text-ink-placeholder transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            </div>
            <hr className="mt-[1.2vh] border-brand-dark/20" />

            <p id={descriptionId} className="mt-[2.2vh] type-xs text-ink">
                Upload your quotation for this project so the receiver can
                review the proposed price and details.
            </p>

            <div className="mt-[2.2vh] flex justify-center">
                <FileUpload
                    kind="pdf"
                    value={file}
                    onChange={(next) => {
                        setFile(next);
                        setError(null);
                    }}
                    onError={setError}
                    className={`flex h-[20vh] min-h-[160px] w-[14vw] min-w-[200px] cursor-pointer flex-col items-center justify-center gap-[1.2vh] rounded-[15px] border border-brand-dark/90 bg-brand-mist/40 px-4 transition-colors hover:bg-brand-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        file ? 'border-solid' : 'border-dashed'
                    }`}
                >
                    {file ? (
                        <>
                            <CloudDoneIcon />
                            <span className="max-w-full truncate type-xs text-ink underline">
                                {file.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <CloudUploadIcon />
                            <span className="type-sm text-ink !font-[500] underline">
                                Click to upload
                            </span>
                            <span className="type-xs text-brand">PDF only</span>
                        </>
                    )}
                </FileUpload>
            </div>

            {error && (
                <p role="alert" className="mt-4 type-xs text-danger">
                    {error}
                </p>
            )}

            <hr className="my-[2.2vh] border-brand-dark/20" />
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!file || isSubmitting}
                    className="rounded-[14px] h-[3.8vh] min-h-[34px] min-w-[105px] px-4 bg-brand type-xs text-surface !font-[600] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
            </div>
        </ModalShell>
    );
}

// The three icons below are the Figma frames' own (Material "cloud_upload",
// "cloud_done" and the success check), coloured with the brand token.

function CloudUploadIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 70 70"
            className="size-[3.6vw] min-h-[44px] min-w-[44px] shrink-0 fill-brand"
        >
            <path d="M56.4375 29.2833C54.4542 19.2208 45.6167 11.6667 35 11.6667C26.5708 11.6667 19.25 16.45 15.6042 23.45C6.825 24.3833 0 31.8208 0 40.8333C0 50.4875 7.84583 58.3333 17.5 58.3333H55.4167C63.4667 58.3333 70 51.8 70 43.75C70 36.05 64.0208 29.8083 56.4375 29.2833ZM40.8333 37.9167V49.5833H29.1667V37.9167H20.4167L33.9792 24.3542C34.5625 23.7708 35.4667 23.7708 36.05 24.3542L49.5833 37.9167H40.8333Z" />
        </svg>
    );
}

function CloudDoneIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 70 70"
            className="size-[3.6vw] min-h-[44px] min-w-[44px] shrink-0 fill-brand"
        >
            <path d="M56.4375 29.2833C54.4542 19.2208 45.6167 11.6667 35 11.6667C26.5708 11.6667 19.25 16.45 15.6042 23.45C6.825 24.3833 0 31.8208 0 40.8333C0 50.4875 7.84583 58.3333 17.5 58.3333H55.4167C63.4667 58.3333 70 51.8 70 43.75C70 36.05 64.0208 29.8083 56.4375 29.2833ZM31.2375 47.5125C30.1 48.65 28.2625 48.65 27.125 47.5125L21 41.4167C19.8625 40.2792 19.8625 38.4417 21 37.3042C22.1375 36.1667 23.975 36.1667 25.1125 37.3042L29.1667 41.3583L42.2333 28.2917C43.3708 27.1542 45.2083 27.1542 46.3458 28.2917C47.4833 29.4292 47.4833 31.2667 46.3458 32.4042L31.2375 47.5125Z" />
        </svg>
    );
}

function SuccessIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 110 110"
            className="size-[5.7vw] min-h-[64px] min-w-[64px] shrink-0 fill-brand"
        >
            <path d="M55 0C24.64 0 0 24.64 0 55C0 85.36 24.64 110 55 110C85.36 110 110 85.36 110 55C110 24.64 85.36 0 55 0ZM55 99C30.745 99 11 79.255 11 55C11 30.745 30.745 11 55 11C79.255 11 99 30.745 99 55C99 79.255 79.255 99 55 99ZM76.34 34.595L44 66.935L33.66 56.595C31.515 54.45 28.05 54.45 25.905 56.595C23.76 58.74 23.76 62.205 25.905 64.35L40.15 78.595C42.295 80.74 45.76 80.74 47.905 78.595L84.15 42.35C86.295 40.205 86.295 36.74 84.15 34.595C82.005 32.45 78.485 32.45 76.34 34.595V34.595Z" />
        </svg>
    );
}
