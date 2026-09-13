'use client';

import type { RegisterAccountType } from '@mangodb/shared';

type RoleStepProps = {
    value: RegisterAccountType | null;
    onChange: (value: RegisterAccountType) => void;
};

const roles: Array<{
    value: RegisterAccountType;
    title: string;
    description: string;
    image: string;
}> = [
    {
        value: 'RECEIVER',
        title: 'Receiver',
        description:
            'Find and hire services for your business.\nค้นหาและว่าจ้างบริการที่ตรงกับธุรกิจของคุณ',
        image: '/images/register/receiver.png',
    },
    {
        value: 'PROVIDER',
        title: 'Provider',
        description:
            'Offer your services to businesses.\nนำเสนอบริการและเชื่อมต่อกับธุรกิจ',
        image: '/images/register/provider.png',
    },
    {
        value: 'BOTH',
        title: 'Dual Account',
        description:
            'Find and offer services in one account.\nค้นหาและนำเสนอบริการในบัญชีเดียว',
        image: '/images/register/both.png',
    },
];

export default function RoleStep({ value, onChange }: RoleStepProps) {
    return (
        <div className="flex flex-col gap-2 pt-2">
            {roles.map((role) => {
                const selected = value === role.value;

                return (
                    <button
                        key={role.value}
                        type="button"
                        onClick={() => onChange(role.value)}
                        aria-pressed={selected}
                        className={`flex w-full items-center gap-5 rounded-button border p-2 text-left transition ${
                            selected
                                ? 'border-[#FEC84A] bg-[#FEC84A] shadow-[2px_4px_4px_rgba(0,0,0,0.25)]'
                                : 'border-[#497B93] bg-[#FFFDF9] hover:bg-[#FFF5DC]'
                        }`}
                    >
                        <span className="h-20 w-20 shrink-0 overflow-hidden rounded-[6px]">
                            <img
                                src={role.image}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        </span>

                        <span className="min-w-0">
                            <span className="block text-md">{role.title}</span>

                            <span className="block whitespace-pre-line text-sm">
                                {role.description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
