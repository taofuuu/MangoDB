// US1-13. The Terms of Service a company accepts when it registers, as written
// in the Figma "ToS" frame. The modal renders whatever this holds, so a future
// revision is an edit here: the intro, then one { heading, body } per section
// in reading order.
export type TermsSection = {
    heading: string;
    body: string;
};

export const TERMS_INTRO =
    'By creating an account and using MangoDB, you agree to the following terms.';

export const TERMS_OF_SERVICE: TermsSection[] = [
    {
        heading: '1. Account Information',
        body: 'You must provide accurate and up-to-date information when creating and maintaining your account.',
    },
    {
        heading: '2. Authorized Use',
        body: 'You may use MangoDB only for its intended purposes. You must not misuse the platform, interfere with its operation, or access data or accounts without authorization.',
    },
    {
        heading: '3. Company Information',
        body: 'If you register on behalf of a company, you confirm that you are authorized to provide and manage the information submitted for that company.',
    },
    {
        heading: '4. User-Submitted Content',
        body: 'You are responsible for the accuracy and appropriateness of information and materials you submit to MangoDB, including company details, portfolios, and certificates.',
    },
    {
        heading: '5. Account Suspension',
        body: 'MangoDB may suspend or terminate access to an account if it is used in violation of these Terms or in a way that may harm the platform or its users.',
    },
    {
        heading: '6. Service Changes',
        body: 'MangoDB may modify, update, or discontinue features of the platform when necessary.',
    },
    {
        heading: '7. Acceptance',
        body: 'By clicking “Accept”, you acknowledge that you have read, understood, and agreed to these Terms of Service.',
    },
];
