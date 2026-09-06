'use client';

import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';

export default function DeleteServiceTermsModal(props: DeleteModalProps) {
    return <DeleteConfirmationModal {...props} title="Delete Service Terms" />;
}
