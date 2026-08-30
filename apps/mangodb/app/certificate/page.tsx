'use client';

import { useState } from 'react';
import FormModal from '@/components/forms/CertificateForm';

export default function Home() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <main className="p-10">
            <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
                Add certification
            </button>

            <FormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </main>
    );
}
