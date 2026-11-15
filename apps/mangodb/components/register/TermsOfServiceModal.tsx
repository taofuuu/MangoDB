'use client';

import ConsentModal from '@/components/register/ConsentModal';
import { TERMS_INTRO, TERMS_OF_SERVICE } from '@/lib/terms';
import PolicySections from '@/components/register/PolicySections';

type TermsOfServiceModalProps = {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
};

// US1-13. Shown when the company presses Create Account without having
// accepted yet. Accepting opens the Privacy Policy dialog next.
export default function TermsOfServiceModal({
    isOpen,
    onAccept,
    onDecline,
}: TermsOfServiceModalProps) {
    return (
        <ConsentModal
            isOpen={isOpen}
            title="Terms of Service"
            onAccept={onAccept}
            onDecline={onDecline}
        >
            <PolicySections intro={TERMS_INTRO} sections={TERMS_OF_SERVICE} />
        </ConsentModal>
    );
}
