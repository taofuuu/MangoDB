'use client';

import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';

export default function DeleteCertificateModal(props: DeleteModalProps) {
    return <DeleteConfirmationModal {...props} title="Delete Certificate" />;
}
