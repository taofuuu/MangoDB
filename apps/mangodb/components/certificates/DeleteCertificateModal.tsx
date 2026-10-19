'use client';

import type { Certificate } from '@mangodb/shared';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { deleteCertificate } from '@/lib/certificates';

type DeleteCertificateModalProps = {
    // The one to delete. Null keeps the dialog closed.
    certificate: Certificate | null;
    onClose: () => void;
    // Called after the API has deleted it, to drop it from the list.
    onDeleted: (certificateId: number) => void;
};

export default function DeleteCertificateModal({
    certificate,
    onClose,
    onDeleted,
}: DeleteCertificateModalProps) {
    const handleConfirm = async () => {
        if (!certificate) return;
        await deleteCertificate(certificate.certificateId);
        onDeleted(certificate.certificateId);
    };

    return (
        <ConfirmModal
            isOpen={certificate !== null}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="Delete Certificate"
            description={
                <span>
                    Are you sure you want to delete{' '}
                    <strong className="font-semibold text-ink">
                        &ldquo;{certificate?.certTitle}&rdquo;
                    </strong>
                    ? This action cannot be undone.
                </span>
            }
        />
    );
}
