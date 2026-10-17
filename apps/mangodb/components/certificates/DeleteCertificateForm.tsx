'use client';

import ConfirmModal, {
    type ConfirmModalBaseProps,
} from '@/components/ui/ConfirmModal';
import type { CertificateData } from './EditCertificateForm';
import { deleteCertificate } from '@/lib/certificates';

export type DeleteCertificateFormProps = Omit<
    ConfirmModalBaseProps,
    'onConfirm'
> & {
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
        <ConfirmModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="Delete Certificate"
            description={
                certificate?.name ? (
                    <span>
                        Are you sure you want to delete{' '}
                        <strong className="font-semibold text-ink">
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
