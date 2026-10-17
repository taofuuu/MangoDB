import { notFound } from 'next/navigation';
import ServiceEditPicker from '@/components/services/ServiceEditPicker';

export default function ServiceEditPickerPage() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <ServiceEditPicker />;
}
