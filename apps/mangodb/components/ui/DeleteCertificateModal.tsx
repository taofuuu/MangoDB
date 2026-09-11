'use client';

import DeleteConfirmationModal, {
    type DeleteModalProps,
} from './DeleteConfirmationModal';
import DeleteCertificateForm, {
    type DeleteCertificateFormProps,
} from '@/components/forms/DeleteCertificateForm';

export default function DeleteCertificateModal(
    props: DeleteCertificateFormProps,
) {
    return <DeleteCertificateForm {...props} />;
}
