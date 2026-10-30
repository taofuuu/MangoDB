// Issue #193. The Privacy Policy (PDPA) shown at /privacy and in the dialog a
// company accepts when it registers, after the Terms of Service. Both render
// whatever this holds, so a change of wording is an edit here: the intro, then
// one { heading, body } per section in reading order. The team still has to
// agree the final text.
import type { TermsSection } from './terms';

export const PRIVACY_INTRO =
    'This policy explains what personal data MangoDB keeps, why we keep it, who can see it, and your rights under the Thai Personal Data Protection Act (PDPA).';

export const PRIVACY_POLICY: TermsSection[] = [
    {
        heading: '1. What Personal Data We Collect',
        body: 'We collect the data you give us when you register and use MangoDB: your company name, the contact person’s name, email, phone number, and address. We also keep what you add to your profile (description, website, portfolios, certificates), and the services, job postings, proposals, hire requests, projects, and reviews you create.',
    },
    {
        heading: '2. Why We Use It',
        body: 'We use your data only to run the marketplace: to show your company profile and listings, to send and answer proposals and hire requests, and to run projects from start to review. We do not sell your data.',
    },
    {
        heading: '3. Who Can See It',
        body: 'Your company profile, services, job postings, portfolios, and certificates are public to other companies. Proposals, hire requests, and project details are visible only to the companies taking part in them. MangoDB administrators can see account data to manage accounts.',
    },
    {
        heading: '4. How Long We Keep It',
        body: 'We keep your data while your account is active. When you delete your account, it is hidden and no longer shown to other companies, but the data stays in our records so past projects and reviews stay correct.',
    },
    {
        heading: '5. Your Rights Under PDPA',
        body: 'You can ask to see the personal data we hold about you, to correct it, or to delete it. You can also withdraw your consent at any time. Most details can be changed on your profile and in Account Settings. For anything else, contact us using the details below.',
    },
    {
        heading: '6. Contact',
        body: 'For questions about this policy or your personal data, contact the MangoDB team. We will answer your request as soon as we can.',
    },
];
