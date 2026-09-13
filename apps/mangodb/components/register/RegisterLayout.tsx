import type { ReactNode } from 'react';
import Image from 'next/image';

type RegisterLayoutProps = {
    children: ReactNode;
    title: string;
    subtitle: string;
    onBack?: (() => void) | undefined;
    onNext?: (() => void) | undefined;
    nextLabel?: string;
    nextDisabled?: boolean;
    showBack?: boolean;
};

export default function RegisterLayout({
    children,
    title,
    subtitle,
    onBack,
    onNext,
    nextLabel = 'Next',
    nextDisabled = false,
    showBack = false,
}: RegisterLayoutProps) {
    return (
        <main className="relative min-h-screen w-full">
            {/* background */}
            <div className="fixed inset-0 -z-10 bg-accent-tint" />

            <div className="fixed left-0 top-0 h-full w-[38%] overflow-hidden rounded-[0_20px_500px_0]">
                <Image
                    src="/images/background-keyboard.png"
                    alt=""
                    fill
                    className="object-cover"
                />
            </div>

            {/* MangoDB Cooperation badge */}
            <div
                className="
                    fixed right-[16px] top-[10px] z-50
                    flex items-center gap-[8px]
                    rounded-full
                    bg-surface
                    px-[12px] py-[8px]
                    shadow-[0_1px_3px_rgba(0,0,0,0.25)]
                "
            >
                <div className="relative h-[25px] w-[32px] overflow-hidden">
                    <Image
                        src="/images/mangodblogo.png"
                        alt="MangoDB"
                        fill
                        className="object-cover"
                    />
                </div>

                <span className="type-sm">MangoDB Cooperation</span>
            </div>

            {/* register card */}
            <div
                className="
                    absolute left-1/2 top-1/2
                    flex h-[75%] w-[55%]
                    -translate-x-1/2 -translate-y-1/2
                    overflow-hidden rounded-status bg-surface shadow-lg

                    max-sm:top-[calc(50%+35px)]
                    max-sm:h-[calc(100%-50px)]
                    max-sm:w-[calc(100%-32px)]
                    "
            >
                {/* left side */}
                <div className="w-[42%] pl-[20px] py-[20px] max-sm:hidden">
                    <div className="relative h-full w-full overflow-hidden rounded-[20px_20px_500px_20px] shadow-lg">
                        <Image
                            src="/images/background-keyboard.png"
                            alt=""
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>

                {/* right side */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col px-[24px] py-[20px]">
                    {/* header */}
                    <header className="shrink-0">
                        <h1 className="type-hd">{title}</h1>

                        <h2 className="type-lg">{subtitle}</h2>

                        <div className="mt-[5px] h-px bg-brand" />
                    </header>

                    {/* content */}
                    <div className="modal-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
                        {children}
                    </div>

                    {/* footer */}
                    <footer className="flex shrink-0 justify-between pt-[10px] max-sm:px-[24px] max-sm:py-[20px]">
                        {showBack ? (
                            <button
                                type="button"
                                onClick={onBack}
                                className="
                    rounded-button
                    border border-brand-dark
                    px-[24px] py-[5px]
                    type-md text-brand-dark
                  "
                            >
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {onNext && (
                            <button
                                type="button"
                                onClick={onNext}
                                disabled={nextDisabled}
                                className="
                    rounded-button
                    bg-brand-dark
                    px-[24px] py-[5px]
                    type-md text-surface
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                            >
                                {nextLabel}
                            </button>
                        )}
                    </footer>
                </div>
            </div>
        </main>
    );
}
