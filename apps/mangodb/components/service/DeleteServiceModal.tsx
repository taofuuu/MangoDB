'use client';

import DeleteConfirmationModal, {
    type DeleteModalProps,
} from '@/components/ui/DeleteConfirmationModal';
// import type { ServiceData } from './EditServiceForm';
// import { deleteService } from '@/lib/servicelisting';

// Delete after have serviceData in EditServiceForm
type ServiceData = {
    listingId?: number;
    title?: string;
    description?: string;
};

export type DeleteServiceFormProps = Omit<DeleteModalProps, 'onConfirm'> & {
    service?: ServiceData | null | undefined;
    onConfirm?: (() => void | Promise<void>) | undefined;
    onDelete?: ((service: ServiceData) => void | Promise<void>) | undefined;
};

export default function DeleteServiceForm({
    isOpen,
    onClose,
    service,
    onConfirm,
    onDelete,
    isDeleting,
}: DeleteServiceFormProps) {
    const handleConfirm = async () => {
        if (service?.listingId) {
            // TO EDIT: Waiting for fixing in lib
            // await deleteService(service.listingId);
        }

        if (onConfirm) {
            await onConfirm();
        }

        if (onDelete && service) {
            await onDelete(service);
        }
    };

    return (
        <DeleteConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleConfirm}
            {...(isDeleting !== undefined ? { isDeleting } : {})}
            title="Delete this service listing?"
            description={
                service?.title ? (
                    <span>
                        <strong className="font-semibold text-ink">
                            &ldquo;{service.title}&rdquo;
                        </strong>
                        will be removed and Receivers will no longer see it in
                        search results. This can&apos;t be undone.{' '}
                    </span>
                ) : (
                    'This service will be removed and Receivers will no longer see it in search results. This can&apos;t be undone.'
                )
            }
        />
    );
}
