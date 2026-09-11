'use client';

import DeleteCertificateForm, {
    type DeleteCertificateFormProps,
} from '@/components/forms/DeleteCertificateForm';

export default function DeleteCertificateModal(
    props: DeleteCertificateFormProps,
) {
    return <DeleteCertificateForm {...props} />;
}
