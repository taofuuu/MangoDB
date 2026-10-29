import Link from 'next/link';
import { PRIVACY_INTRO, PRIVACY_POLICY } from '@/lib/privacy';

export const metadata = {
    title: 'Privacy Policy | MangoDB',
    description:
        'What personal data MangoDB keeps, why, who can see it, and your rights under PDPA.',
};

// Issue #193. Public: no sign-in needed, so the register and login pages can
// link here. Laid out like the Terms of Service dialog (title, rule, numbered
// sections), as a page instead of a modal. The text lives in lib/privacy.ts.
export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-accent-tint px-4 py-8 sm:px-6 sm:py-12">
            <article className="mx-auto max-w-[760px] rounded-popup bg-surface px-6 py-8 text-ink shadow-lg sm:px-12 sm:py-10">
                <h1 className="type-hd max-sm:!text-[28px]">
                    Privacy Policy (PDPA)
                </h1>

                <div className="mt-3 h-px bg-ink-soft" />

                <p className="mt-6 type-md !font-[400] leading-[1.65]">
                    {PRIVACY_INTRO}
                </p>

                {PRIVACY_POLICY.map((section) => (
                    <section key={section.heading} className="mt-6">
                        <h2 className="type-lg !font-[500] max-sm:!text-[20px]">
                            {section.heading}
                        </h2>
                        <p className="mt-1 type-md !font-[400] leading-[1.65]">
                            {section.body}
                        </p>
                    </section>
                ))}

                <p className="mt-8 type-sm text-ink-soft">
                    See also the Terms of Service you accept when you{' '}
                    <Link
                        href="/register"
                        className="font-medium text-brand-dark underline underline-offset-2 hover:text-brand-deep"
                    >
                        sign up
                    </Link>
                    .
                </p>
            </article>
        </main>
    );
}
