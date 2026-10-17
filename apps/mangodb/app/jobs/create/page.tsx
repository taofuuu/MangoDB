'use client';

import JobForm from '@/components/forms/JobForm';
import PageGate from '@/components/auth/PageGate';
import { useMyCompany } from '@/lib/useMyCompany';

export default function CreateJobPage() {
    const me = useMyCompany('receiver');

    if (me.status !== 'ready') {
        return (
            <PageGate
                state={me}
                roleMessage="You need a Receiver account to create job postings."
            />
        );
    }

    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh] text-ink">
            <div className="ml-[9vw] flex w-full max-w-5xl flex-col gap-[1.94vh]">
                <h1 className="type-hd">Create Your Job Posting</h1>

                <hr className="w-[80.9375vw] border-brand-dark/50" />

                <p className="type-md !font-[600]">*Indicates required</p>

                <div className="mt-[1px] ml-[7vw] flex w-full justify-center">
                    <JobForm />
                </div>
            </div>
        </main>
    );
}
