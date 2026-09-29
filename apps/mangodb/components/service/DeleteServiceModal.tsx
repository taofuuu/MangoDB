import type { ReactNode } from 'react';
import DeleteConfirmationModal, {
    type DeleteModalProps,
} from '@/components/ui/DeleteConfirmationModal';
type DeleteServiceFormProps = Omit<DeleteModalProps, 'isOpen'> & {
    isOpen: boolean;
    title: string;
    description: ReactNode;
    // Pass through any other props from DeleteConfirmationModal
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    pendingLabel?: string;
    cancelLabel?: string;
    icon?: ReactNode;
    layout?: 'inline' | 'stacked';
    confirmDisabled?: boolean;
    children?: ReactNode;
};

/**
 * A custom confirmation modal wrapper that enforces custom title and description values.
 */
export function DeleteServiceFormModal({
    title,
    description,
    ...props
}: DeleteServiceFormProps) {
    return (
        <DeleteConfirmationModal
            title={title}
            description={description}
            {...props}
        />
    );
}
