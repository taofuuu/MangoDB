'use client';

import Button from '../ui/Button';

// The danger zone at the foot of the middle column. US1-6 owns what the button
// actually does — a company with a project in progress has to be refused — so
// this only puts the control where the design has it.
export default function DeleteAccountSection() {
    return (
        <div className="mt-[6.2vh]">
            <h2 className="mb-[1.2vh] text-lg text-[#C5483B]">
                Delete account
            </h2>

            <hr className="border-t border-[#D9D9D9]" />

            <p className="mt-[1.5vh] text-md !font-[400]">
                Once you delete your account, there is no going back. Please be
                certain.
            </p>

            <Button
                variant="danger"
                onClick={() => console.log('TODO(US1-6): delete account')}
                className="mt-[1.2vh] h-[3.06vh] w-[9.84vw] cursor-pointer text-sm"
            >
                Delete your account
            </Button>
        </div>
    );
}
