import { notFound } from 'next/navigation';
import QuotationPreview from './QuotationPreview';

export default function QuotationPreviewPage() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <QuotationPreview />;
}
