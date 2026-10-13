'use client';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export default function SuccessModal({
    isOpen,
    onClose,
    title = 'Service Updated Successfully',
}: SuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity">
            <div className="w-full max-w-[480px] bg-surface rounded-popup p-8 shadow-xl border border-line flex flex-col items-center">
                {/* Content Row: Checkmark Icon + Message */}
                <div className="flex items-center gap-4 w-full mb-6">
                    <div className="w-14 h-14 rounded-full border-[3px] border-brand flex items-center justify-center shrink-0">
                        <svg
                            className="w-7 h-7 text-brand"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <h3 className="type-md font-bold text-ink">{title}</h3>
                </div>

                <hr className="w-full border-line mb-6" />

                {/* Footer Action Button */}
                <div className="w-full flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-2 rounded-button bg-brand text-surface-white type-sm font-semibold hover:bg-brand-dark transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
