'use client';

import { Grid2X2, Rows3 } from 'lucide-react';

export type CompanyView = 'grid' | 'list';

type CompanyViewToggleProps = {
    value: CompanyView;
    onChange: (view: CompanyView) => void;
};

const optionClass =
    'flex h-[4.17vh] min-h-[40px] w-[2.29vw] min-w-[40px] items-center justify-center rounded-[6px] transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none';

export default function CompanyViewToggle({
    value,
    onChange,
}: CompanyViewToggleProps) {
    const optionState = (view: CompanyView) =>
        value === view
            ? 'bg-brand text-white shadow-sm'
            : 'text-ink-soft hover:bg-brand/10 hover:text-ink';

    return (
        <div
            role="group"
            aria-label="Choose company result layout"
            className="flex rounded-button border border-line bg-white p-[0.19vh]"
        >
            <button
                type="button"
                aria-pressed={value === 'grid'}
                onClick={() => onChange('grid')}
                className={`${optionClass} ${optionState('grid')}`}
            >
                <Grid2X2 aria-hidden="true" className="size-5" />
            </button>
            <button
                type="button"
                aria-pressed={value === 'list'}
                onClick={() => onChange('list')}
                className={`${optionClass} ${optionState('list')}`}
            >
                <Rows3 aria-hidden="true" className="size-5" />
            </button>
        </div>
    );
}
