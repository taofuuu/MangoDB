import { notFound } from 'next/navigation';
import ServiceEditPicker from '@/components/service/ServiceEditPicker';

export default function ServiceEditPickerPage() {
    if (process.env.NODE_ENV !== 'development') {
        notFound();
    }

    return <ServiceEditPicker />;
}
