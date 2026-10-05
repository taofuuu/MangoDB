// US1-13. The Terms of Service a company accepts when it registers.
//
// DRAFT: placeholder wording so the consent flow can be built and tested. The
// final text has to come from the team before release.
//
// To publish the final terms, replace the entries below — one { heading, body }
// per section, in reading order. Nothing else changes: the modal renders
// whatever this list holds, and it scrolls however long the text gets. Once the
// final text is in, delete this DRAFT note.
export type TermsSection = {
    heading: string;
    body: string;
};

export const TERMS_OF_SERVICE: TermsSection[] = [
    {
        heading: '1. Acceptance of Terms',
        body: 'By creating a MangoDB account, your company agrees to these Terms of Service. If you do not agree, do not register or use the platform.',
    },
    {
        heading: '2. Your Account',
        body: 'You are responsible for the accuracy of the company information you provide and for keeping your username and password secure. Activity under your account is treated as activity by your company.',
    },
    {
        heading: '3. Use of the Platform',
        body: 'MangoDB connects companies that offer services with companies that need them. You agree not to post false, misleading, or unlawful content, and not to interfere with other users or with the operation of the platform.',
    },
    {
        heading: '4. Listings, Postings, and Proposals',
        body: 'Service listings, job postings, and proposals are the responsibility of the company that publishes them. MangoDB does not guarantee the quality, safety, or legality of any listed work, and is not a party to agreements made between companies.',
    },
    {
        heading: '5. Your Data',
        body: 'We store the information you provide to run your account and to show your public company profile to other users. We record the time you accepted these terms as proof of consent.',
    },
    {
        heading: '6. Suspension and Deletion',
        body: 'We may suspend or delete accounts that break these terms. You may delete your account at any time from your account settings.',
    },
    {
        heading: '7. Changes to These Terms',
        body: 'We may update these terms. Continuing to use MangoDB after an update means you accept the updated terms.',
    },
];
