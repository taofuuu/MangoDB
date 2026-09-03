'use client';

import { useState } from 'react';
import FormModal from '@/components/forms/CertificateForm';
import EditCertificateForm, {
    CertificateData,
} from '@/components/forms/EditCertificateForm';

export default function CertificatePage() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Sample data to pre-fill the edit form (can be replaced with dynamic data)
    const [certificateToEdit, setCertificateToEdit] = useState<CertificateData>(
        {
            name: 'Microsoft Certified: Azure Fundamentals',
            organize: 'Microsoft',
            month: 'March',
            year: '2023',
            exMonth: 'March',
            exYear: '2026',
            credID: 'AZ-900-123456',
            credURL:
                'https://learn.microsoft.com/certifications/azure-fundamentals',
        },
    );

    return (
        <main className="flex gap-4 p-10">
            {/* Add Certification Button */}
            <button
                onClick={() => setIsAddOpen(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
                Add certification
            </button>

            {/* Edit Certificate Button */}
            <button
                onClick={() => setIsEditOpen(true)}
                className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-colors"
            >
                Edit certificate
            </button>

            {/* Add Certificate Modal */}
            <FormModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

            {/* Edit Certificate Modal */}
            <EditCertificateForm
                isOpen={isEditOpen}
                initialData={certificateToEdit}
                onClose={() => setIsEditOpen(false)}
                onSave={(updatedData) => {
                    setCertificateToEdit(updatedData);
                    console.log('Saved changes:', updatedData);
                }}
            />
        </main>
    );
}
