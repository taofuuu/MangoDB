import type { JobPosting } from '@mangodb/shared';
import Image from 'next/image';
interface JobBoxProps {
    job: JobPosting;
    onSelect: (jobPostingId: number) => void;
}

export default function JobBox({ job, onSelect }: JobBoxProps) {
    return (
        <button
            type="button"
            onClick={() => onSelect(job.jobPostingId)}
            aria-label={`View details for ${job.listingTitle}`}
            className="flex h-[19.9vh] w-[54.69vw] pt-[2.87vh]  pl-[2.29vw] pr-[2.29vw] flex-col gap-[2.22vh] rounded-[30px] shadow-sm bg-white p-[0.83vw] text-left shadow-sm transition hover:-translate-y-[0.19vh] hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        >
            <h2 className=" truncate type-md text-ink">
                {job.listingTitle}
            </h2>

            <div className="flex w-full items-start justify-between bg-transparent">
                <div className="flex items-center gap-[0.52vw]">
                    {/* Categories rendered in the same badge/tag format as CompanyCard */}
                    <Image
                        src="/images/category.png"
                        alt="Category"
                        width={25}
                        height={25}
                    />
                    <div className="flex min-h-[2.22vh] flex-wrap gap-[0.42vw]">
                        {job.categories && job.categories.length > 0 ? (
                            job.categories.map((category) => (
                                <span
                                    key={category}
                                    className="rounded-status bg-[#FEC84A] px-[0.63vw] py-[0.19vh] type-sm !font-[600] text-ink"
                                >
                                    {category}
                                </span>
                            ))
                        ) : (
                            <span className="rounded-status bg-[#F3F4F6] px-[0.63vw] py-[0.19vh] type-sm !font-[600]">
                                General
                            </span>
                        )}
                    </div>
                </div>
                <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                    <Image
                        src="/images/deadline.svg"
                        alt="Deadline"
                        width={22}
                        height={22}
                    />
                    {job.deadline || 'No job deadline provided'}
                </p>
            </div>

            <div className="flex w-full items-start justify-between">
                <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                    <Image
                        src="/images/Budget.png"
                        alt="Budget"
                        width={25}
                        height={25}
                    />
                    {job.minBudget}-{job.maxBudget}
                </p>

                <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                    <Image
                        src="/images/location.png"
                        alt="Location"
                        width={20}
                        height={20}
                    />
                    {job.locationPref}
                </p>

                <p className="flex items-center gap-[0.52vw] line-clamp-4 type-sm leading-relaxed">
                    {job.companyName}
                </p>
            </div>

        </button>
    );
}
