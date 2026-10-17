'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Certificate } from '@mangodb/shared';
import ImageModal, { type ExpandedImage } from '@/components/ui/ImageModal';
import { NOT_SIGNED_IN, describeError, isNotSignedIn } from '@/lib/api';
import { formatCertificatePeriod, listCertificates } from '@/lib/certificates';
import { getCompanyProfile, parseCompanyId } from '@/lib/companies';
import { isStorageImage } from '@/lib/images';
import { redirectToUnauthorized } from '@/lib/session';

const NOT_FOUND = 'This company could not be found.';

// Tagged with the id it answers, so moving to another company shows
// "Loading…" instead of the previous company's certificates.
type LoadResult =
    | { companyId: number; companyName: string; certificates: Certificate[] }
    | { companyId: number; error: string };

// /profile/[companyId]/certificates: another company's certificates, opened
// from See more on its profile. The same rows as /certificates, without Add,
// Edit and Delete.
export default function CompanyCertificatesPage() {
    const companyId = parseCompanyId(useParams().companyId);
    const [result, setResult] = useState<LoadResult | null>(null);
    const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(
        null,
    );

    useEffect(() => {
        if (companyId === null) return;

        let cancelled = false;
        // The profile gives the name for the heading, and its 404 is how an
        // unknown or deleted company shows up.
        Promise.all([
            getCompanyProfile(companyId),
            listCertificates({ companyId }),
        ])
            .then(([profile, certificates]) => {
                if (cancelled) return;
                setResult({
                    companyId,
                    companyName: profile.companyName,
                    certificates,
                });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                if (isNotSignedIn(err)) {
                    setResult({ companyId, error: NOT_SIGNED_IN });
                    redirectToUnauthorized();
                    return;
                }
                setResult({
                    companyId,
                    error: describeError(err, { 404: NOT_FOUND }),
                });
            });

        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const current =
        companyId !== null && result?.companyId === companyId ? result : null;
    const loaded = current && 'certificates' in current ? current : null;
    const loadError =
        companyId === null
            ? NOT_FOUND
            : current && 'error' in current
              ? current.error
              : null;

    if (loadError === NOT_SIGNED_IN) {
        return <div className="min-h-screen bg-surface" />;
    }

    const certificates = loaded?.certificates;

    return (
        <main className="min-h-screen bg-surface pt-10">
            <div className="mx-auto mt-8 h-[80.7vh] w-[76.5vw] overflow-hidden rounded-xl border border-brand bg-white pr-1 pl-6">
                <div className="h-full overflow-y-auto pr-1">
                    <div className="flex w-full items-center pt-5">
                        {companyId !== null && (
                            <Link
                                href={`/profile/${companyId}`}
                                aria-label="Back to the company profile"
                                className="type-lg pr-4"
                            >
                                ←
                            </Link>
                        )}
                        <p className="type-hd">Certificates</p>
                    </div>

                    {loaded && (
                        <p className="type-md pt-1">{loaded.companyName}</p>
                    )}

                    {loadError && (
                        <p
                            role="alert"
                            className="mt-8 type-md !font-[400] text-danger"
                        >
                            {loadError}
                        </p>
                    )}

                    {!loadError && !certificates && (
                        <p className="mt-8 type-md !font-[400]">Loading…</p>
                    )}

                    {certificates?.length === 0 && (
                        <p className="mt-8">No certificates yet.</p>
                    )}

                    {certificates?.map((cert) => (
                        <div key={cert.certificateId}>
                            <div className="flex w-full items-center justify-between pt-2 pl-6">
                                <h2 className="type-lg">
                                    {/* A link only when there is somewhere
                                        to go, as on /certificates. */}
                                    {cert.credentialUrl ? (
                                        <a
                                            href={cert.credentialUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                                        >
                                            {cert.certTitle}
                                        </a>
                                    ) : (
                                        cert.certTitle
                                    )}
                                </h2>
                            </div>
                            <p className="type-md pl-6">{cert.organization}</p>

                            {formatCertificatePeriod(cert) && (
                                <p className="type-md pl-6">
                                    {formatCertificatePeriod(cert)}
                                </p>
                            )}

                            {cert.credentialId && (
                                <p className="type-md pl-6">
                                    Credential ID: {cert.credentialId}
                                </p>
                            )}

                            <div className="pb-2" />

                            <div className="pl-6 pb-1">
                                <a
                                    href={cert.credentialUrl ?? '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex h-[4vh] w-[13.8vw] items-center justify-center gap-[0.4vw] rounded-status border transition-colors ${
                                        cert.credentialUrl
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

                            <div className="flex w-full items-center gap-10 pt-4 pl-6 pr-6 pb-1">
                                {/* Only our own uploads, since next/image
                                    throws on any other host. */}
                                {cert.certImage &&
                                isStorageImage(cert.certImage) ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedImage({
                                                title: cert.certTitle,
                                                src: cert.certImage!,
                                            })
                                        }
                                        aria-label={`Expand the image for ${cert.certTitle}`}
                                        className="flex h-[10vh] w-[9.375vw] cursor-zoom-in items-center justify-center rounded-button border border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                                    >
                                        <Image
                                            src={cert.certImage}
                                            alt=""
                                            width={200}
                                            height={150}
                                            className="h-full w-full rounded-button object-contain"
                                        />
                                    </button>
                                ) : (
                                    <div className="flex h-[10vh] w-[9.375vw] items-center justify-center rounded-button border border-brand" />
                                )}

                                <p className="type-md">{cert.certTitle}</p>
                            </div>

                            <hr className="mx-auto mt-4 w-[95%] border-brand-dark/50" />
                        </div>
                    ))}
                </div>
            </div>

            {expandedImage && (
                <ImageModal
                    image={expandedImage}
                    onClose={() => setExpandedImage(null)}
                />
            )}
        </main>
    );
}
