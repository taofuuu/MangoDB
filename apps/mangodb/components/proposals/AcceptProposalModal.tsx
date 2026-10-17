'use client';

interface AcceptProposalModalProps {
    isOpen: boolean;
    companyName: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function AcceptProposalModal({
    isOpen,
    companyName,
    onClose,
    onConfirm,
}: AcceptProposalModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[480px] bg-white rounded-2xl p-8 shadow-xl">
                {/* Icon + Title */}
                <div className="flex items-start gap-5 mb-6">
                    {/* Checkmark icon */}
                    <svg
                        className="w-10 h-10 text-[#437788] shrink-0 mt-0.5"
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

                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            Accept this proposal?
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Please review the proposal details before accepting.
                            Once you accept, a project with{' '}
                            <strong>{companyName}</strong> will be created and
                            your job posting will close.
                        </p>
                    </div>
                </div>

                <hr className="border-slate-200 mb-6" />

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-full bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition-colors"
                    >
                        Go Back
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-6 py-2.5 rounded-full bg-[#437788] text-white text-sm font-semibold hover:bg-[#37647a] transition-colors"
                    >
                        Accept proposal
                    </button>
                </div>
            </div>
        </div>
    );
}
