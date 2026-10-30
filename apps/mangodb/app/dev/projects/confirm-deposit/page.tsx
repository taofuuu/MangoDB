import { notFound } from 'next/navigation';
import ConfirmDepositPreview from './ConfirmDepositPreview';

export default function ConfirmDepositPreviewPage() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <ConfirmDepositPreview />;
}
