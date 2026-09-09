import type { ReactNode } from 'react';
import Image from 'next/image';

type RegisterLayoutProps = {
    children: ReactNode;
    title: string;
    subtitle: string;
    onBack?: () => void;
    onNext?: () => void;
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
            <div className="fixed inset-0 -z-10 bg-[#FFF5DC]" />

            <div className="fixed left-0 top-0 h-full w-[38%] overflow-hidden rounded-[0_20px_500px_0]">
                <Image
                    src="/images/background-keyboard.png"
                    alt=""
                    fill
                    className="object-cover"
                />
            </div>

            {/* register card */}
            <div
                className="
          absolute left-1/2 top-1/2
          flex h-[75%] w-[55%]
          -translate-x-1/2 -translate-y-1/2
          overflow-hidden rounded-status bg-white shadow-lg

          max-sm:h-[calc(100%-32px)]
          max-sm:w-[calc(100%-32px)]
        "
            >
                {/* left side */}
                <div className="w-[42%] pl-[20px] py-[20px] max-sm:hidden">
                    <div className="relative h-full w-full overflow-hidden rounded-[20px_20px_500px_20px]">
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
                        <h1 className="text-hd">{title}</h1>

                        <h2 className="text-lg">{subtitle}</h2>

                        <div className="mt-[5px] h-px bg-[#497B93]" />
                    </header>

                    {/* content */}
                    <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto">
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
                    text-md text-white
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
