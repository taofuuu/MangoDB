'use client';

import { useId } from 'react';
import Button from '@/components/ui/Button';
import ModalShell from '@/components/ui/ModalShell';

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
    const titleId = useId();

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            labelledBy={titleId}
            panelClassName="w-full max-w-[480px] rounded-popup border border-line bg-surface p-8 shadow-xl"
        >
            <div className="flex flex-col items-center">
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
                    <h3 id={titleId} className="type-md font-bold text-ink">
                        {title}
                    </h3>
                </div>

                <hr className="w-full border-line mb-6" />

                {/* Footer Action Button */}
                <div className="w-full flex justify-end">
                    <Button
                        onClick={onClose}
                        className="px-8 py-2 type-sm font-semibold"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </ModalShell>
    );
}
