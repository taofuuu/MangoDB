import AddServiceForm from '@/components/service/AddServiceForm';

export default async function EditServicePage({
    params,
}: PageProps<'/services/[listingId]/edit'>) {
    const { listingId } = await params;

    return <AddServiceForm listingId={Number(listingId)} />;
}
