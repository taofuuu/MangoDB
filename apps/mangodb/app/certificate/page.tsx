'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AddCertificateForm from '@/components/forms/AddCertificateForm';
import EditCertificateForm, {
    type CertificateData,
} from '@/components/forms/EditCertificateForm';
import DeleteCertificateForm from '@/components/forms/DeleteCertificateForm';
import { ApiRequestError } from '@/lib/api';
import { getCertificates } from '@/lib/certificate';
import { monthLabel } from '@/components/sm-detail/MonthDropdown';
import Image from 'next/image';
import edit from '@/public/edit.png';
import bin from '@/public/bin.png';

export default function CertificatePage() {
    // Null means still loading.
    const [certificates, setCertificates] = useState<CertificateData[] | null>(
        null,
    );
    const [loadError, setLoadError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Certificate currently being edited.
    const [certificateToEdit, setCertificateToEdit] =
        useState<CertificateData | null>(null);

    // Certificate currently being deleted.
    const [certificateToDelete, setCertificateToDelete] =
        useState<CertificateData | null>(null);

    // GET certificates
    useEffect(() => {
        getCertificates()
            .then((data) => {
                const mappedCertificates: CertificateData[] = data.map(
                    (cert) => ({
                        id: cert.certificate_id,
                        name: cert.cert_title,
                        organize: cert.organization,

                        ...(cert.issue_month != null && {
                            month: cert.issue_month.toString(),
                        }),
                        ...(cert.issue_year != null && {
                            year: cert.issue_year.toString(),
                        }),
                        ...(cert.expire_month != null && {
                            exMonth: cert.expire_month.toString(),
                        }),
                        ...(cert.expire_year != null && {
                            exYear: cert.expire_year.toString(),
                        }),
                        ...(cert.credential_id != null && {
                            credID: cert.credential_id,
                        }),
                        ...(cert.credential_url != null && {
                            credURL: cert.credential_url,
                        }),

                        cert_image: cert.cert_image ?? null,
                    }),
                );

                setCertificates(mappedCertificates);
            })
            .catch((err: unknown) => {
                if (err instanceof ApiRequestError && err.status === 401) {
                    setLoadError('no-token');
                    return;
                }

                setLoadError(
                    err instanceof ApiRequestError
                        ? err.message
                        : 'Could not reach the API. Is it running on port 4000?',
                );
            });
    }, []);

    // -------------------------
    // ADD
    // -------------------------
    const handleAddCertificate = (newCertificate: CertificateData) => {
        setCertificates((current) => [...(current ?? []), newCertificate]);
    };

    // -------------------------
    // EDIT
    // -------------------------
    const handleEditCertificate = (updatedCertificate: CertificateData) => {
        setCertificates((current) =>
            (current ?? []).map((certificate) =>
                certificate.id === updatedCertificate.id
                    ? updatedCertificate
                    : certificate,
            ),
        );

        setCertificateToEdit(null);
        setIsEditOpen(false);
    };

    // -------------------------
    // DELETE
    // -------------------------
    // DeleteCertificateForm has already called the API by this point; this
    // only drops the row from the list.
    const handleDeleteCertificate = () => {
        if (!certificateToDelete) return;

        setCertificates((current) =>
            (current ?? []).filter(
                (certificate) => certificate.id !== certificateToDelete.id,
            ),
        );

        setCertificateToDelete(null);
        setIsDeleteOpen(false);
    };

    // Every date part is optional, so this collapses to whatever was filled in
    // rather than rendering a half-empty "Issue  ".
    const formatPeriod = (certificate: CertificateData) => {
        const issued = [monthLabel(certificate.month), certificate.year]
            .filter(Boolean)
            .join(' ');
        const expires = [monthLabel(certificate.exMonth), certificate.exYear]
            .filter(Boolean)
            .join(' ');

        if (issued && expires) return `Issued ${issued} · Expires ${expires}`;
        if (issued) return `Issued ${issued}`;
        if (expires) return `Expires ${expires}`;
        return '';
    };

    return (
        <main className="min-h-screen bg-[#FFFDF9] pt-10">
            {/* Certificate Box */}
            <div className="mx-auto mt-8 h-[80.7vh] w-[76.5vw] overflow-y-auto certificate-scrollbar rounded-xl border border-[#497B93] bg-white pr-1 pl-6">
                <div className="certificate-scrollbar h-full overflow-y-auto pr-1">
                    <div className="flex w-full items-center pt-5">
                        <Link href="/" className="text-lg pr-4">
                            ←
                        </Link>
                        <p className="text-hd">Certificates</p>
                    </div>
                    {/* Loading */}
                    {certificates === null && !loadError && (
                        <p className="mt-8">Loading certificates...</p>
                    )}
                    {/* Empty */}
                    {certificates !== null && certificates.length === 0 && (
                        <p className="mt-8">
                            No certificates yet. Add one with the + button.
                        </p>
                    )}
                    {/* Certificate List */}
                    {certificates !== null && (
                        <div>
                            {certificates.map((certificate) => (
                                <div key={certificate.id}>
                                    <div className="flex w-full items-center justify-between pt-2 pl-6">
                                        <h2 className="text-lg">
                                            {certificate.name}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCertificateToEdit(
                                                    certificate,
                                                );
                                                setIsEditOpen(true);
                                            }}
                                            className="pr-6"
                                        >
                                            <Image
                                                src={edit}
                                                alt="Edit"
                                                width={24}
                                                height={24}
                                            />
                                        </button>
                                    </div>
                                    <p className="text-md pl-6">
                                        {certificate.organize}
                                    </p>

                                    {formatPeriod(certificate) && (
                                        <p className="text-md pl-6">
                                            {formatPeriod(certificate)}
                                        </p>
                                    )}

                                    {certificate.credID && (
                                        <p className="text-md pl-6">
                                            Credential ID: {certificate.credID}
                                        </p>
                                    )}

                                    <div className="pb-2" />

                                    {/* Show Credential */}
                                    <div className="pl-6 pb-1">
                                        <a
                                            href={certificate.credURL ?? '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex h-[4vh] w-[13.8vw] items-center justify-center gap-[0.4vw] rounded-status border transition-colors ${
                                                certificate.credURL
                                                    ? 'hover:border-[#66A6C5]'
                                                    : 'pointer-events-none opacity-50'
                                            }`}
                                        >
                                            <span className="text-md">
                                                Show Credential
                                            </span>
                                            <span className="text-md">→</span>
                                        </a>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex w-full items-center justify-between pt-4 pl-6 pr-6 pb-1">
                                        <div className="flex w-full items-center gap-10">
                                            <div className="flex h-[10vh] w-[9.375vw] items-center justify-center rounded-button border border-[#497B93]">
                                                {certificate.cert_image && (
                                                    <Image
                                                        src={
                                                            certificate.cert_image
                                                        }
                                                        alt={
                                                            certificate.name ??
                                                            'Certificate'
                                                        }
                                                        width={200}
                                                        height={150}
                                                        className="h-full w-full rounded-button object-contain"
                                                    />
                                                )}
                                            </div>

                                            <p className="text-md">
                                                {certificate.name}
                                            </p>
                                        </div>
                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCertificateToDelete(
                                                    certificate,
                                                );
                                                setIsDeleteOpen(true);
                                            }}
                                        >
                                            <Image
                                                src={bin}
                                                alt="Bin"
                                                width={24}
                                                height={24}
                                            />
                                        </button>
                                    </div>

                                    {/* Centered divider */}
                                    <hr className="mx-auto mt-4 w-[95%] border-[#3F6B80]/50" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex w-full justify-end pr-12">
                <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="flex h-[9vh] w-[9vh] items-center justify-center rounded-full bg-[#497B93] text-hd text-[#FFFDF9] transition-colors hover:bg-[#3F6B80]"
                >
                    +
                </button>
            </div>

            {/* Load error */}
            {loadError && (
                <p role="alert" className="mt-4 text-sm text-[#C5483E]">
                    {loadError === 'no-token'
                        ? 'Please log in to view your certificates.'
                        : loadError}
                </p>
            )}

            {/* ADD MODAL */}
            <AddCertificateForm
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSave={handleAddCertificate}
            />

            {/* EDIT MODAL */}
            <EditCertificateForm
                isOpen={isEditOpen}
                initialData={certificateToEdit ?? undefined}
                onClose={() => {
                    setIsEditOpen(false);
                    setCertificateToEdit(null);
                }}
                onSave={handleEditCertificate}
            />

            {/* DELETE MODAL */}
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
