import { notFound } from 'next/navigation';
import ServiceForm from '@/components/service/ServiceForm';

const INT4_MAX = 2_147_483_647;

export default async function EditServicePage({
    params,
}: PageProps<'/services/[serviceId]/edit'>) {
    const { serviceId } = await params;
    if (!/^\d+$/.test(serviceId)) notFound();

    const parsedServiceId = Number(serviceId);
    if (parsedServiceId < 1 || parsedServiceId > INT4_MAX) notFound();

    return <ServiceForm mode="edit" serviceId={parsedServiceId} />;
}
