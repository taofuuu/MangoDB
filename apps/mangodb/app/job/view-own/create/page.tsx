import JobForm from '@/components/forms/JobForm';

export default function CreateJobPage() {
    return (
        <main className="min-h-screen bg-surface px-[1.67vw] py-[2.96vh] text-ink">
            <div className="ml-[9vw] flex w-full max-w-5xl flex-col gap-[1.94vh]">
                <h1 className="type-hd">Create Your Job Posting</h1>

                <hr className="border-brand-dark/50 w-[80.9375vw]" />

                <p className="type-md !font-[600]">*Indicates required</p>

                <div className="mt-[1px] ml-[7vw] flex w-full justify-center">
                    <JobForm />
                </div>
            </div>
        </main>
    );
}
