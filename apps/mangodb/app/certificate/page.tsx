'use client';

import { useEffect, useState } from 'react';
import AddCertificateForm, {
    CertificateResponse,
} from '@/components/forms/AddCertificateForm';
import EditCertificateForm, {
    type CertificateData,
} from '@/components/forms/EditCertificateForm';
import DeleteCertificateForm from '@/components/forms/DeleteCertificateForm';
import { apiFetch } from '@/lib/api';

const INITIAL_CERTIFICATES: CertificateData[] = [
    {
        id: 1,
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

// function formatMonthYear(month?: string, year?: string): string {
//     if (!month && !year) return '';
//     const num = parseInt(month || '', 10);
//     const monthStr =
//         !isNaN(num) && num >= 1 && num <= 12 ? MONTH_NAMES[num] : month || '';
//     if (monthStr && year) return `${monthStr} ${year}`;
//     return monthStr || year || '';
// }

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

    useEffect(() => {
        const fetchCertificates = async () => {
            const res = await apiFetch<CertificateResponse[]>(
                '/certificates/provider',
                {
                    method: 'GET',
                },
            );
            const formatted_certs: CertificateData[] = res.map(
                (cert: CertificateResponse) => ({
                    id: cert.certificate_id,
                    name: cert.cert_title,
                    organize: cert.organization,
                    month: String(cert.issue_month) ?? undefined,
                    year: String(cert.issue_year) ?? undefined,
                    exMonth: String(cert.expire_month) ?? undefined,
                    exYear: String(cert.expire_year) ?? undefined,
                    credID: cert.credential_id ?? undefined,
                    credURL: cert.credential_url ?? undefined,
                }),
            );
            setCertificates(formatted_certs);
        };

        fetchCertificates();
    }, []);

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
                    (certificateToEdit?.id != null &&
                        certificate.id === certificateToEdit.id) ||
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
                    (certificateToDelete.id != null &&
                        certificate.id === certificateToDelete.id) ||
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
