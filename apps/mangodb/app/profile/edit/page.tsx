'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditProfileForm, {
    ProfileFormData,
} from '@/components/forms/EditProfileForm';

// Mock data so the form is interactable before there is a login page to get a
// token from. This file is the only place that changes when the form is wired
// up: GET /companies/me fills initialData, PATCH /companies/me handles onSave.
const MOCK_PROFILE: ProfileFormData = {
    username: 'codecrafters',
    company_name: 'CodeCrafters Co., Ltd.',
    company_description:
        'A Bangkok software house building web and mobile products for SMEs.',
    email: 'contact@codecrafters.co.th',
    phone: '+66 2 123 4567',
    website: 'https://codecrafters.co.th',
    address: '123 Sukhumvit Road, Khlong Toei, Bangkok 10110, Thailand',
    company_type: ['Technology consultant', 'Software House'],
    account_type: 'BOTH',
    service_term:
        'Work is delivered in two-week sprints. Payment is due 30 days ' +
        'after each milestone is accepted.',
    warranty_policy:
        'Defects reported within 90 days of delivery are fixed at no charge.',
    photoUrl: null,
};

export default function EditProfilePage() {
    const [saved, setSaved] = useState<ProfileFormData>(MOCK_PROFILE);
    const router = useRouter();

    // Cancel leaves the page. Opening /profile/edit directly leaves nothing to
    // go back to, so fall back to the index rather than doing nothing.
    const handleCancel = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        // pt matches the gap the design leaves under the 108px navbar, which
        // is a separate task, so spacing stays right once that lands.
        <main className="min-h-screen bg-[#FFFDF9] px-[2.19vw] pt-[6.25vh] text-[#171717]">
            <EditProfileForm
                initialData={saved}
                onSave={(data) => {
                    setSaved(data);
                    console.log('saved profile', data);
                }}
                onCancel={handleCancel}
            />
        </main>
    );
}
