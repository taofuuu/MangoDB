'use client';

import { useState } from 'react';
// import type { Service } from '@mangodb/shared';
import DeleteServiceForm from '@/components/service/DeleteServiceModal';

type ServiceData = {
    listingId?: number;
    title?: string;
    description?: string;
};

// 1. Mock data to test the UI
const MOCK_SERVICES: ServiceData[] = [
    {
        listingId: 1,
        title: 'Web Development Service',
        description: 'Full-stack development service',
    },
    {
        listingId: 2,
        title: 'Graphic Design Service',
        description: 'UI/UX and branding design',
    },
];

export default function ServicePage() {
    // 2. Initialize with mock data
    const [service, setService] = useState<ServiceData[] | null>(MOCK_SERVICES);

    // 3. Open modal by default with the first item selected
    const [isDeleteOpen, setIsDeleteOpen] = useState(true);
    const [serviceToDelete, setServiceToDelete] = useState<ServiceData | null>(
        MOCK_SERVICES[0] ?? null,
    );

    const handleDeleteService = () => {
        if (!serviceToDelete) return;

        setService((current) =>
            (current ?? []).filter(
                (service) => service.listingId !== serviceToDelete.listingId,
            ),
        );

        setServiceToDelete(null);
        setIsDeleteOpen(false);
    };

    return (
        <div>
            {/* Optional preview button to reopen the modal if closed */}
            <button
                className="rounded bg-red-600 px-4 py-2 text-white"
                onClick={() => {
                    setServiceToDelete(service?.[0] ?? null);
                    setIsDeleteOpen(true);
                }}
            >
                Open Delete Modal
            </button>

            <DeleteServiceForm
                isOpen={isDeleteOpen}
                service={serviceToDelete ?? undefined}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setServiceToDelete(null);
                }}
                onConfirm={handleDeleteService}
            />
        </div>
    );
}
