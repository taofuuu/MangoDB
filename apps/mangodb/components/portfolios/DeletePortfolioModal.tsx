'use client';

import ConfirmModal, { type ConfirmModalBaseProps } from '../ui/ConfirmModal';

export default function DeletePortfolioModal(props: ConfirmModalBaseProps) {
    return <ConfirmModal {...props} title="Delete Portfolio" />;
}
