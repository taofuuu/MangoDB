'use client';

import ConsentModal from '@/components/register/ConsentModal';
import PolicySections from '@/components/register/PolicySections';
import { PRIVACY_INTRO, PRIVACY_POLICY } from '@/lib/privacy';

type PrivacyPolicyModalProps = {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
};

// Issue #193. Opens right after the Terms of Service is accepted. Accepting
// here is the last step before the account is created.
export default function PrivacyPolicyModal({
    isOpen,
    onAccept,
    onDecline,
}: PrivacyPolicyModalProps) {
    return (
        <ConsentModal
            isOpen={isOpen}
            title="Privacy Policy (PDPA)"
            onAccept={onAccept}
            onDecline={onDecline}
        >
            <PolicySections intro={PRIVACY_INTRO} sections={PRIVACY_POLICY} />
        </ConsentModal>
    );
}
