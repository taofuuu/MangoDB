'use client';

import type { AccountType } from '@mangodb/shared';

type RoleStepProps = {
    value: AccountType | null;
    onChange: (value: AccountType) => void;
    onNext: () => void;
};

const roles: Array<{
    value: AccountType;
    title: string;
    description: string;
    icon: string;
}> = [
    {
        value: 'RECEIVER',
        title: 'Receiver',
        description:
            'Find and hire services for your business.\nค้นหาและว่าจ้างบริการที่ตรงกับธุรกิจของคุณ',
        icon: '⌕',
    },
    {
        value: 'PROVIDER',
        title: 'Provider',
        description:
            'Offer your services to businesses.\nนำเสนอบริการและเชื่อมต่อกับธุรกิจ',
        icon: '⌁',
    },
    {
        value: 'BOTH',
        title: 'Dual Account',
        description:
            'Find and offer services in one account.\nค้นหาและนำเสนอบริการในบัญชีเดียว',
        icon: '↔',
    },
];

export default function RoleStep({ value, onChange, onNext }: RoleStepProps) {
    return (
        <div className="flex min-h-[720px] flex-col py-9 lg:min-h-[800px] lg:py-12">
            <div className="mt-8 flex flex-1 flex-col gap-4">
                {roles.map((role) => {
                    const selected = value === role.value;

                    return (
                        <button
                            key={role.value}
                            type="button"
                            onClick={() => onChange(role.value)}
                            className={`flex w-full items-center gap-5 rounded-md border p-5 text-left transition ${
                                selected
                                    ? 'border-[#FEC84A] bg-[#FEC84A] shadow-[2px_4px_4px_rgba(0,0,0,0.25)]'
                                    : 'border-[#497B93] bg-white/50 hover:bg-white'
                            }`}
                        >
                            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-[#497B93] bg-[#FFFDF9] text-4xl font-semibold">
                                {role.icon}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-md">
                                    {role.title}
                                </span>
                                <span className="mt-2 block whitespace-pre-line text-sm">
                                    {role.description}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
