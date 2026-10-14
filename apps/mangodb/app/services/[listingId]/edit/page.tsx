import { notFound } from 'next/navigation';
import ServiceForm from '@/components/service/ServiceForm';

const INT4_MAX = 2_147_483_647;

export default async function EditServicePage({
    params,
}: PageProps<'/services/[listingId]/edit'>) {
    const { listingId } = await params;
    if (!/^\d+$/.test(listingId)) notFound();

    const parsedListingId = Number(listingId);
    if (parsedListingId < 1 || parsedListingId > INT4_MAX) notFound();

    return <ServiceForm mode="edit" listingId={parsedListingId} />;
}
