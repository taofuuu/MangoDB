import type { ReactNode } from 'react';
import Image from 'next/image';
import DecorativePattern from '@/components/auth/Decorate';

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
        <main className="relative min-h-screen w-full overflow-hidden bg-[#FCEFD7]">
            {/* background */}
            <DecorativePattern
                className="
                    pointer-events-none
                    absolute
                    left-0
                    top-0
                    hidden
                    h-screen
                    aspect-[1366/2192]
                    overflow-hidden
                    rounded-br-[calc(100vh*1366/2192)]
                    opacity-80
                    sm:block
                "
            />

            {/* MangoDB Cooperation badge */}
            <div
                className="
                    fixed right-[16px] top-[10px] z-50
                    flex items-center gap-[8px]
                    rounded-full
                    bg-[#FFFDF9]
                    px-[12px] py-[8px]
                    shadow-[0_1px_3px_rgba(0,0,0,0.25)]
                "
            >
                <div className="relative h-[25px] w-[32px] overflow-hidden">
                    <Image
                        src="/assets/MangoDB_Logo_nobg.png"
                        alt="MangoDB"
                        fill
                        className="object-cover"
                    />
                </div>

                <span className="text-sm">MangoDB Cooperation</span>
            </div>

            {/* register card */}
            <div
                className="
                    absolute left-1/2 top-1/2
                    flex h-[80vh] w-[55%]
                    -translate-x-1/2 -translate-y-1/2
                    overflow-hidden rounded-[32px] bg-[#FFFDF9] shadow-lg
                    p-4

                    max-sm:top-[calc(50%+35px)]
                    max-sm:h-[calc(100%-50px)]
                    max-sm:w-[calc(100%-35px)]
                    "
            >
                {/* left side */}
                <div className="w-[42%] max-sm:hidden">
                    <div className="relative h-full w-full overflow-hidden rounded-3xl rounded-br-[calc(100vh*1366/2192)] shadow-lg">
                        <Image
                            src="/assets/background.png"
                            alt=""
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>

                {/* right side */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col pl-4">
                    {/* header */}
                    <header className="shrink-0">
                        <h1 className="text-hd">{title}</h1>

                        <h2 className="text-lg">{subtitle}</h2>

                        <div className="mt-[5px] h-px bg-[#497B93]" />
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
                    border border-[#3F6B80]
                    px-[24px] py-[5px]
                    text-md text-[#3F6B80]
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
                                    bg-[#3F6B80]
                                    px-[24px] py-[5px]
                                    text-md text-[#FFFDF9]
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
