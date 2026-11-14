import { notFound } from 'next/navigation';
import ServiceForm from '@/components/services/ServiceForm';
import { parseId } from '@/lib/api';

export default async function EditServicePage({
    params,
}: PageProps<'/services/[serviceId]/edit'>) {
    const serviceId = parseId((await params).serviceId);
    if (serviceId === null) notFound();

    return <ServiceForm mode="edit" serviceId={serviceId} />;
}
