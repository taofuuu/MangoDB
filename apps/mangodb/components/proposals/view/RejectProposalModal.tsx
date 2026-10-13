'use client';

interface RejectProposalModalProps {
    isOpen: boolean;
    companyName: string;
    onClose: () => void;
    onConfirm: () => void;
}

export default function RejectProposalModal({
    isOpen,
    companyName,
    onClose,
    onConfirm,
}: RejectProposalModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-[480px] bg-white rounded-2xl p-8 shadow-xl">
                {/* Icon + Title */}
                <div className="flex items-start gap-5 mb-6">
                    {/* X icon */}
                    <svg
                        className="w-10 h-10 text-[#C5483B] shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>

                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            Reject this proposal?
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            The proposal from <strong>{companyName}</strong>{' '}
                            will be rejected. This can&apos;t be undone.
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
                        className="px-6 py-2.5 rounded-full bg-[#C5483B] text-white text-sm font-semibold hover:bg-[#a83c30] transition-colors"
                    >
                        Delete proposal
                    </button>
                </div>
            </div>
        </div>
    );
}
