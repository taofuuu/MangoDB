import { notFound } from 'next/navigation';
import DepositPreview from './DepositPreview';

export default function DepositPreviewPage() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <DepositPreview />;
}
