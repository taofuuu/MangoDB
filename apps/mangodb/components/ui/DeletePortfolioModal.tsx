'use client';

import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';

export default function DeletePortfolioModal(props: DeleteModalProps) {
    return <DeleteConfirmationModal {...props} title="Delete Portfolio" />;
}
