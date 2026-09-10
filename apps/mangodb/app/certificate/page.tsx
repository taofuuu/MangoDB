'use client';

import { useState } from 'react';
import AddFormModal from '@/components/forms/AddCertificateForm';
import EditCertificateForm, {
    type CertificateData,
} from '@/components/forms/EditCertificateForm';
import DeleteCertificateModal from '@/components/ui/DeleteCertificateModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function CertificatePage() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Store all certificates
    const [certificates, setCertificates] = useState<CertificateData[]>([
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
    ]);

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

        console.log('Added certificate:', newCertificate);
    };

    const handleEditCertificate = async (
        updatedCertificate: CertificateData,
    ) => {
        const certId = (certificateToEdit as any)?.certificate_id;

        // Call backend API if ID exists
        if (certId) {
            try {
                const token = localStorage.getItem('token');

                // Map frontend fields to backend Prisma schema format
                const payload = {
                    cert_title: updatedCertificate.name,
                    organization: updatedCertificate.organize,
                    issue_month: updatedCertificate.month
                        ? Number(updatedCertificate.month)
                        : null,
                    issue_year: updatedCertificate.year
                        ? Number(updatedCertificate.year)
                        : null,
                    expire_month: updatedCertificate.exMonth
                        ? Number(updatedCertificate.exMonth)
                        : null,
                    expire_year: updatedCertificate.exYear
                        ? Number(updatedCertificate.exYear)
                        : null,
                    credential_id: updatedCertificate.credID || null,
                    credential_url: updatedCertificate.credURL || null,
                };

                const res = await fetch(
                    `${API_BASE_URL}/companies/certificates/${certId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: token ? `Bearer ${token}` : '',
                        },
                        body: JSON.stringify(payload),
                    },
                );

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(
                        data.message || 'Failed to update certificate',
                    );
                }
            } catch (error: any) {
                alert(error.message);
                return;
            }
        }

        // Update local state
        setCertificates((prev) =>
            prev.map((certificate) =>
                certificate === certificateToEdit
                    ? updatedCertificate
                    : certificate,
            ),
        );

        console.log('Updated certificate:', updatedCertificate);
        setCertificateToEdit(null);
        setIsEditOpen(false);
    };

    // -------------------------
    // DELETE
    // -------------------------

    const handleDeleteCertificate = async () => {
        // Assumes certificateToDelete has certificate_id (e.g. from backend)
        const certId = (certificateToDelete as any)?.certificate_id;

        if (!certificateToDelete) return;

        // Call backend API if ID exists
        if (certId) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API_BASE_URL}/companies/certificates/${certId}`,
                    {
                        method: 'DELETE',
                        headers: {
                            Authorization: token ? `Bearer ${token}` : '',
                        },
                    },
                );

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(
                        data.message || 'Failed to delete certificate',
                    );
                }
            } catch (error: any) {
                alert(error.message);
                return;
            }
        }

        // Update local state
        setCertificates((prev) =>
            prev.filter((certificate) => certificate !== certificateToDelete),
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
                        setCertificateToEdit(certificates[0]);
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

            <AddFormModal
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

            <DeleteCertificateModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDeleteCertificate}
            />
        </main>
    );
}
