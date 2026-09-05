import Image from 'next/image';
import DecorativePattern from './Decorate';
import LoginForm from './LoginForm';

export default function LoginCard() {
    return (
        <div className="relative z-10 flex w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-black/10">
            {/* Decorative inset panel — echoes the page's background pattern, clipped into the card */}
            <DecorativePattern className="hidden shrink-0 rounded-br-[calc(100vh*1366/2192)] md:block md:w-[300px] lg:w-[340px]" />

            {/* Form panel */}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-14 sm:px-14">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Image
                        src="/assets/mangodblogo.png"
                        alt="MangoDB logo"
                        width={48}
                        height={48}
                        priority
                    />
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-[28px]">
                        MangoDB Cooperation
                    </h1>
                    <p className="text-sm text-gray-600">
                        Welcome to B-B Business
                    </p>
                </div>

                <div className="w-full max-w-sm">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
