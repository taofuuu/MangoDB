'use client';

export type PortfolioView = 'grid' | 'list';

type ViewToggleProps = {
    value: PortfolioView;
    onChange: (value: PortfolioView) => void;
};

// Same box for both buttons, only the fill changes with the active view.
const buttonClass =
    'flex h-[4.17vh] min-h-[36px] w-[2.29vw] min-w-[40px] items-center justify-center rounded-[6px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F6B80]';

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
    const fill = (view: PortfolioView) =>
        value === view ? 'bg-[#E0E0E0]' : 'bg-transparent hover:bg-black/5';

    return (
        <div className="flex gap-[0.4vw]">
            <button
                type="button"
                aria-label="Grid view"
                aria-pressed={value === 'grid'}
                onClick={() => onChange('grid')}
                className={`${buttonClass} ${fill('grid')}`}
            >
                <svg
                    viewBox="0 0 20 20"
                    className="size-[20px]"
                    aria-hidden="true"
                >
                    <rect
                        x="1"
                        y="1"
                        width="8"
                        height="8"
                        rx="1.5"
                        fill="#171717"
                    />
                    <rect
                        x="11"
                        y="1"
                        width="8"
                        height="8"
                        rx="1.5"
                        fill="#171717"
                    />
                    <rect
                        x="1"
                        y="11"
                        width="8"
                        height="8"
                        rx="1.5"
                        fill="#171717"
                    />
                    <rect
                        x="11"
                        y="11"
                        width="8"
                        height="8"
                        rx="1.5"
                        fill="#171717"
                    />
                </svg>
            </button>

            <button
                type="button"
                aria-label="List view"
                aria-pressed={value === 'list'}
                onClick={() => onChange('list')}
                className={`${buttonClass} ${fill('list')}`}
            >
                <svg
                    viewBox="0 0 20 20"
                    className="size-[20px]"
                    aria-hidden="true"
                >
                    <rect
                        x="1"
                        y="3"
                        width="18"
                        height="2"
                        rx="1"
                        fill="#171717"
                    />
                    <rect
                        x="1"
                        y="9"
                        width="18"
                        height="2"
                        rx="1"
                        fill="#171717"
                    />
                    <rect
                        x="1"
                        y="15"
                        width="18"
                        height="2"
                        rx="1"
                        fill="#171717"
                    />
                </svg>
            </button>
        </div>
    );
}
