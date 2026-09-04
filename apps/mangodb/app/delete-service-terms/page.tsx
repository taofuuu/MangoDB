'use client';

import { type MouseEvent, useState } from 'react';
import DeleteServiceTermsModal from '@/components/ui/DeleteServiceTermsModal';

export default function DeleteServiceTermsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsModalOpen(true);
    };

    return (
        <main className="min-h-screen p-[3.7vh]">
            <button
                type="button"
                onClick={handleOpenModal}
                className="rounded-button h-[4.44vh] min-h-[40px] w-[10.42vw] min-w-[160px] bg-[#CE473E] text-sm text-[#FFFDF9] !font-[600] transition-colors hover:bg-[#B93D35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE473E]"
            >
                Open Delete Popup
            </button>

            <DeleteServiceTermsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={() => setIsModalOpen(false)}
            />
        </main>
    );
}
