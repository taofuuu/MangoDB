'use client';

import DeleteConfirmationModal, {
    type DeleteModalProps,
} from '@/components/ui/DeleteConfirmationModal';
import type { CertificateData } from './EditCertificateForm';
import { deleteCertificate } from '@/lib/certificate';

export type DeleteCertificateFormProps = Omit<DeleteModalProps, 'onConfirm'> & {
    certificate?: CertificateData | null | undefined;
    onConfirm?: (() => void | Promise<void>) | undefined;
    onDelete?:
        ((certificate: CertificateData) => void | Promise<void>) | undefined;
};

export default function DeleteCertificateForm({
    isOpen,
    onClose,
    certificate,
    onConfirm,
    onDelete,
    isDeleting,
}: DeleteCertificateFormProps) {
    const handleConfirm = async () => {
        if (certificate?.id) {
            await deleteCertificate(certificate.id);
        }

        if (onConfirm) {
            await onConfirm();
        }

        if (onDelete && certificate) {
            await onDelete(certificate);
        }
    };

    return (
        <DeleteConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleConfirm}
            {...(isDeleting !== undefined ? { isDeleting } : {})}
            title="Delete Certificate"
            description={
                certificate?.name ? (
                    <span>
                        Are you sure you want to delete{' '}
                        <strong className="font-semibold text-[#171717]">
                            &ldquo;{certificate.name}&rdquo;
                        </strong>
                        ? This action cannot be undone.
                    </span>
                ) : (
                    'Are you sure you want to delete this certificate? This action cannot be undone.'
                )
            }
        />
    );
}
