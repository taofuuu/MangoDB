'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Certificate } from '@mangodb/shared';
import CertificateForm from '@/components/certificates/CertificateForm';
import DeleteCertificateModal from '@/components/certificates/DeleteCertificateModal';
import ImageModal, { type ExpandedImage } from '@/components/ui/ImageModal';
import EmptyState from '@/components/ui/EmptyState';
import UnauthorizedPage from '@/components/auth/UnauthorizedPage';
import {
    NOT_SIGNED_IN,
    describeError,
    isForbidden,
    isNotSignedIn,
} from '@/lib/api';
import {
    formatCertificatePeriod,
    listMyCertificates,
} from '@/lib/certificates';
import { isStorageImage } from '@/lib/images';
import Image from 'next/image';
import edit from '@/public/edit.png';
import bin from '@/public/bin.png';
import { redirectToUnauthorized } from '@/lib/session';

export default function CertificatePage() {
    // Null means still loading.
    const [certificates, setCertificates] = useState<Certificate[] | null>(
        null,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);

    // The form is open for a new certificate, or for the one being edited.
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [certificateToEdit, setCertificateToEdit] =
        useState<Certificate | null>(null);
    // The one the delete dialog asks about. Null keeps it closed.
    const [certificateToDelete, setCertificateToDelete] =
        useState<Certificate | null>(null);

    // The certificate image open full size. Null means the dialog is closed.
    const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(
        null,
    );

    // GET certificates
    useEffect(() => {
        listMyCertificates()
            .then(setCertificates)
            .catch((err: unknown) => {
                if (isNotSignedIn(err)) {
                    setLoadError(NOT_SIGNED_IN);
                    redirectToUnauthorized();
                    return;
                }
                if (isForbidden(err)) {
                    setIsRestricted(true);
                    return;
                }

                setLoadError(describeError(err));
            });
    }, []);

    const handleAdded = (added: Certificate) => {
        setCertificates((current) => [...(current ?? []), added]);
    };

    const handleEdited = (updated: Certificate) => {
        setCertificates((current) =>
            (current ?? []).map((certificate) =>
                certificate.certificateId === updated.certificateId
                    ? updated
                    : certificate,
            ),
        );
    };

    // The dialog has already called the API; this drops the row.
    const handleDeleted = (certificateId: number) => {
        setCertificates((current) =>
            (current ?? []).filter(
                (certificate) => certificate.certificateId !== certificateId,
            ),
        );
    };

    if (certificates === null && !loadError && !isRestricted) {
        return <div className="min-h-screen bg-surface" />;
    }

    if (isRestricted) {
        return (
            <UnauthorizedPage
                variant="danger"
                icon="shield"
                title="Access Restricted"
                badge="Insufficient permissions"
                message="You need a Provider account to view and manage certificates."
                showLogin={false}
            />
        );
    }

    if (loadError === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    return (
        <main className="min-h-screen bg-surface pt-10">
            {/* Certificate Box */}
            <div className="mx-auto mt-8 h-[80.7vh] w-[76.5vw] overflow-hidden rounded-xl border border-brand bg-surface-white pr-1 pl-6">
                <div className="h-full overflow-y-auto pr-1">
                    <div className="flex w-full items-center pt-5">
                        <Link href="/profile/view" className="type-lg pr-4">
                            ←
                        </Link>
                        <p className="type-hd">Certificates</p>
                    </div>

                    {/* Anything else really is an error. */}
                    {loadError && loadError !== NOT_SIGNED_IN && (
                        <p
                            role="alert"
                            className="mt-8 type-md !font-[400] text-danger"
                        >
                            {loadError}
                        </p>
                    )}

                    {/* Empty */}
                    {certificates !== null && certificates.length === 0 && (
                        <EmptyState
                            title="No certificates yet"
                            message="Add one with the + button."
                        />
                    )}
                    {/* Certificate List */}
                    {certificates !== null && (
                        <div>
                            {certificates.map((certificate) => (
                                <div key={certificate.certificateId}>
                                    <div className="flex w-full items-center justify-between pt-2 pl-6">
                                        <h2 className="type-lg">
                                            {/* An anchor, not a button:
                                                middle-click, copy link and
                                                screen readers all expect a
                                                link for an external URL. A
                                                certificate with no credential
                                                URL stays plain text rather
                                                than a link that goes nowhere,
                                                which is what the Show
                                                Credential button below does
                                                too. */}
                                            {certificate.credentialUrl ? (
                                                <a
                                                    href={
                                                        certificate.credentialUrl
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                                                >
                                                    {certificate.certTitle}
                                                </a>
                                            ) : (
                                                certificate.certTitle
                                            )}
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCertificateToEdit(
                                                    certificate,
                                                );
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
                                    <p className="type-md pl-6">
                                        {certificate.organization}
                                    </p>

                                    {formatCertificatePeriod(certificate) && (
                                        <p className="type-md pl-6">
                                            {formatCertificatePeriod(
                                                certificate,
                                            )}
                                        </p>
                                    )}

                                    {certificate.credentialId && (
                                        <p className="type-md pl-6">
                                            Credential ID:{' '}
                                            {certificate.credentialId}
                                        </p>
                                    )}

                                    <div className="pb-2" />

                                    {/* Show Credential */}
                                    <div className="pl-6 pb-1">
                                        <a
                                            href={
                                                certificate.credentialUrl ?? '#'
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex h-[4vh] w-[13.8vw] items-center justify-center gap-[0.4vw] rounded-status border transition-colors ${
                                                certificate.credentialUrl
                                                    ? 'hover:border-brand-light'
                                                    : 'pointer-events-none opacity-50'
                                            }`}
                                        >
                                            <span className="type-md">
                                                Show Credential
                                            </span>
                                            <span className="type-md">→</span>
                                        </a>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex w-full items-center justify-between pt-4 pl-6 pr-6 pb-1">
                                        <div className="flex w-full items-center gap-10">
                                            {/* A button only with an image
                                                behind it: an empty frame has
                                                nothing to expand. Only our own
                                                uploads, since next/image throws
                                                on any other host. */}
                                            {certificate.certImage &&
                                            isStorageImage(
                                                certificate.certImage,
                                            ) ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedImage({
                                                            title:
                                                                certificate.certTitle ??
                                                                'Certificate',
                                                            src: certificate.certImage!,
                                                        })
                                                    }
                                                    aria-label={`Expand the image for ${certificate.certTitle}`}
                                                    className="flex h-[10vh] w-[9.375vw] cursor-zoom-in items-center justify-center rounded-button border border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                                                >
                                                    <Image
                                                        src={
                                                            certificate.certImage
                                                        }
                                                        alt=""
                                                        width={200}
                                                        height={150}
                                                        className="h-full w-full rounded-button object-contain"
                                                    />
                                                </button>
                                            ) : (
                                                <div className="flex h-[10vh] w-[9.375vw] items-center justify-center rounded-button border border-brand" />
                                            )}

                                            <p className="type-md">
                                                {certificate.certTitle}
                                            </p>
                                        </div>
                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCertificateToDelete(
                                                    certificate,
                                                );
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
                                    <hr className="mx-auto mt-4 w-[95%] border-brand-dark/50" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {certificates !== null && (
                <div className="flex w-full justify-end pr-12">
                    <button
                        type="button"
                        onClick={() => setIsAddOpen(true)}
                        className="flex h-[9vh] w-[9vh] items-center justify-center rounded-full bg-brand type-hd text-surface transition-colors hover:bg-brand-dark"
                    >
                        +
                    </button>
                </div>
            )}

            {expandedImage && (
                <ImageModal
                    image={expandedImage}
                    onClose={() => setExpandedImage(null)}
                />
            )}

            {isAddOpen && (
                <CertificateForm
                    onClose={() => setIsAddOpen(false)}
                    onSave={handleAdded}
                />
            )}

            {certificateToEdit && (
                <CertificateForm
                    certificate={certificateToEdit}
                    onClose={() => setCertificateToEdit(null)}
                    onSave={handleEdited}
                />
            )}

            <DeleteCertificateModal
                certificate={certificateToDelete}
                onClose={() => setCertificateToDelete(null)}
                onDeleted={handleDeleted}
            />
        </main>
    );
}
