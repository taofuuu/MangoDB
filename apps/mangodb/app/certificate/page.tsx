'use client';

import { useState } from 'react';
import AddCertificateForm from '@/components/forms/AddCertificateForm';
import EditCertificateForm, {
    type CertificateData,
} from '@/components/forms/EditCertificateForm';
import DeleteCertificateForm from '@/components/forms/DeleteCertificateForm';

const INITIAL_CERTIFICATES: CertificateData[] = [
    {
        certificate_id: 1,
        name: 'Microsoft Certified: Azure Fundamentals',
        organize: 'Microsoft',
        month: '3',
        year: '2023',
        exMonth: '3',
        exYear: '2026',
        credID: 'AZ-900-123456',
        credURL:
            'https://learn.microsoft.com/certifications/azure-fundamentals',
    },
];

const MONTH_NAMES = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

function formatMonthYear(month?: string, year?: string): string {
    if (!month && !year) return '';
    const num = parseInt(month || '', 10);
    const monthStr =
        !isNaN(num) && num >= 1 && num <= 12 ? MONTH_NAMES[num] : month || '';
    if (monthStr && year) return `${monthStr} ${year}`;
    return monthStr || year || '';
}

export default function CertificatePage() {
    const [certificates, setCertificates] =
        useState<CertificateData[]>(INITIAL_CERTIFICATES);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Certificate currently being edited
    const [certificateToEdit, setCertificateToEdit] =
        useState<CertificateData | null>(null);

    // Certificate currently being deleted
    const [certificateToDelete, setCertificateToDelete] =
        useState<CertificateData | null>(null);

    // -------------------------
    // ADD
    // -------------------------
    const handleAddCertificate = (newCertificate: CertificateData) => {
        setCertificates((prev) => [...prev, newCertificate]);
    };

    // -------------------------
    // EDIT
    // -------------------------
    const handleEditCertificate = (updatedCertificate: CertificateData) => {
        setCertificates((prev) =>
            prev.map((certificate) => {
                const isMatch =
                    (certificateToEdit?.certificate_id != null &&
                        certificate.certificate_id ===
                            certificateToEdit.certificate_id) ||
                    certificate === certificateToEdit;
                return isMatch ? updatedCertificate : certificate;
            }),
        );

        setCertificateToEdit(null);
        setIsEditOpen(false);
    };

    // -------------------------
    // DELETE
    // -------------------------
    const handleDeleteCertificate = () => {
        if (!certificateToDelete) return;

        setCertificates((prev) =>
            prev.filter((certificate) => {
                const isMatch =
                    (certificateToDelete.certificate_id != null &&
                        certificate.certificate_id ===
                            certificateToDelete.certificate_id) ||
                    certificate === certificateToDelete;
                return !isMatch;
            }),
        );

        setCertificateToDelete(null);
        setIsDeleteOpen(false);
    };

    return (
        <main className="p-10">
            {/* Buttons */}
            <div className="flex gap-4">
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                    Add certification
                </button>

                <button
                    onClick={() => {
                        // Empty list means there is nothing to edit.
                        setCertificateToEdit(certificates[0] ?? null);
                        setIsEditOpen(true);
                    }}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                >
                    Edit certificate
                </button>
            </div>

            {/* ------------------------- */}
            {/* Certificate List */}
            {/* ------------------------- */}

            <div className="mt-8 space-y-4">
                {certificates.map((certificate, index) => (
                    <div key={index} className="rounded-lg border p-4">
                        <h2 className="font-semibold">{certificate.name}</h2>

                        <p>{certificate.organize}</p>

                        <p>
                            {certificate.month} {certificate.year}
                        </p>

                        <p>Credential ID: {certificate.credID}</p>

                        {/* Delete button */}
                        <button
                            onClick={() => {
                                setCertificateToDelete(certificate);
                                setIsDeleteOpen(true);
                            }}
                            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {/* ------------------------- */}
            {/* ADD MODAL */}
            {/* ------------------------- */}

            <AddCertificateForm
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleAddCertificate}
            />

            {/* ------------------------- */}
            {/* EDIT MODAL */}
            {/* ------------------------- */}

            <EditCertificateForm
                isOpen={isEditOpen}
                initialData={certificateToEdit ?? undefined}
                onClose={() => {
                    setIsEditOpen(false);
                    setCertificateToEdit(null);
                }}
                onSave={handleEditCertificate}
            />

            {/* ------------------------- */}
            {/* DELETE MODAL */}
            {/* ------------------------- */}

            <DeleteCertificateForm
                isOpen={isDeleteOpen}
                certificate={certificateToDelete ?? undefined}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setCertificateToDelete(null);
                }}
                onConfirm={handleDeleteCertificate}
            />
        </main>
    );
}
