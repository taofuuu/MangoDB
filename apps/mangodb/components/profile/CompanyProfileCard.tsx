'use client';

import Link from 'next/link';
import type { PublicCompanyProfile } from '@mangodb/shared';
import { isProviderAccount } from '@/lib/roles';
import RoleTags from '../companies/RoleTags';
import CompanyAvatar from '../companies/CompanyAvatar';
import Tag from '../ui/Tag';

type CompanyProfileCardProps = {
    profile: PublicCompanyProfile;
    // 'wide' sits beside the services on a provider's profile; 'narrow' is the
    // tall column beside the jobs on a receiver's.
    layout: 'wide' | 'narrow';
    // Another company's profile shows the same card with no way to edit it.
    readOnly?: boolean;
};

// The nullable columns read "Not provided" rather than leaving an empty line,
// which looks like a loading glitch.
const orNotProvided = (value: string | null) => value ?? 'Not provided';

// Plain text under a label, not a read-only textarea. A textarea takes focus,
// draws an input border and is announced as "textbox", which is what made a
// page for reading feel like a form for filling in.
function Field({
    label,
    value,
    className = '',
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={className}>
            <p className="type-xs !font-[600] text-ink-soft">{label}</p>
            <p className="mt-1 type-sm whitespace-pre-line text-ink">{value}</p>
        </div>
    );
}

// The company's own card at the top of its profile. A provider's also shows
// its service term and warranty policy.
export default function CompanyProfileCard({
    profile,
    layout,
    readOnly = false,
}: CompanyProfileCardProps) {
    const isWide = layout === 'wide';

    return (
        <div
            className={
                isWide
                    ? 'flex h-[420px] w-full flex-col overflow-hidden rounded-popup border border-line bg-surface-white p-8 shadow-sm md:flex-row md:gap-8'
                    : 'flex h-full w-full flex-col overflow-hidden rounded-popup border border-line bg-surface-white p-8 shadow-sm'
            }
        >
            {/* Who the company is. Fixed rather than scrolled: it is short
                enough to always fit, and scrolling it along with the details
                is what pushed the phone number off the card. wrap-anywhere
                breaks a long name, email or website that has no spaces
                instead of letting it spill out of the card. */}
            <div
                className={
                    isWide
                        ? 'flex shrink-0 flex-col items-center justify-center border-line py-4 text-center wrap-anywhere md:w-1/3 md:border-r md:pr-8'
                        : 'mb-5 flex shrink-0 flex-col items-center text-center wrap-anywhere'
                }
            >
                <CompanyAvatar
                    name={profile.companyName}
                    photoUrl={profile.companyPhoto}
                    size={isWide ? 96 : 80}
                    className={isWide ? 'mb-4' : 'mb-3'}
                />

                {/* Three lines at most, so a name near the 255-character limit
                    cannot push the contact lines off the fixed-height card. */}
                <h2
                    title={profile.companyName}
                    className={`mb-3 line-clamp-3 tracking-tight text-ink ${
                        isWide ? 'type-lg !font-[700]' : 'type-md !font-bold'
                    }`}
                >
                    {profile.companyName}
                </h2>

                <RoleTags
                    accountType={profile.accountType}
                    className="mb-3 gap-2"
                    tagClassName="h-[2.6vh] min-h-[24px] px-3 type-xs"
                />

                <div
                    className={`type-xs text-ink-soft ${
                        isWide ? 'space-y-1' : 'space-y-0.5'
                    }`}
                >
                    <p>{orNotProvided(profile.contactEmail)}</p>
                    <p>{orNotProvided(profile.website)}</p>
                    <p>{profile.phone}</p>
                </div>
            </div>

            {/* The details, and the only thing that scrolls. Edit sits under
                the scroll rather than inside it, so it is always reachable. */}
            <div
                className={
                    isWide
                        ? 'flex min-h-0 w-full flex-col md:w-2/3'
                        : 'flex min-h-0 flex-1 flex-col'
                }
            >
                <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                    <div
                        className={
                            isWide
                                ? 'grid w-full grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2'
                                : 'flex flex-col gap-4'
                        }
                    >
                        <Field
                            label="Company Description"
                            value={
                                profile.companyDescription ??
                                'No description provided.'
                            }
                        />

                        {/* The tags themselves, not a joined string: they are
                            chips on screen, the same ones the edit form shows. */}
                        <div>
                            <p className="type-xs !font-[600] text-ink-soft">
                                Company Type
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {profile.companyType.length > 0 ? (
                                    profile.companyType.map((type) => (
                                        <Tag
                                            key={type}
                                            label={type}
                                            className="h-[2.6vh] min-h-[24px] bg-fill-muted px-3 type-xs text-ink"
                                        />
                                    ))
                                ) : (
                                    <p className="type-sm text-ink">
                                        Not specified
                                    </p>
                                )}
                            </div>
                        </div>

                        {isProviderAccount(profile.accountType) && (
                            <>
                                <Field
                                    label="Company Service Term"
                                    value={orNotProvided(profile.serviceTerm)}
                                />
                                <Field
                                    label="Company Warranty Policy"
                                    value={orNotProvided(
                                        profile.warrantyPolicy,
                                    )}
                                />
                            </>
                        )}

                        <Field
                            label="Company Address"
                            value={orNotProvided(profile.address)}
                            className={isWide ? 'md:col-span-2' : ''}
                        />
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex shrink-0 justify-end pt-4">
                        <Link
                            href="/profile/edit"
                            className="rounded-button bg-brand px-6 py-1.5 type-xs !font-medium text-surface-white shadow-sm transition-colors hover:bg-brand-dark"
                        >
                            Edit
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
