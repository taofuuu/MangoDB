import Image from 'next/image';
import DecorativePattern from './Decorate';
import LoginForm from './LoginForm';

export default function LoginCard() {
    return (
        <div
            className="relative z-10 flex w-[55vw] max-w-4xl h-[80vh] overflow-hidden rounded-[32px] bg-[#FFFDF9] p-4 shadow-lg shadow-black/10

                    max-sm:h-[calc(100%-50px)]
                    max-sm:w-[calc(100%-32px)]"
        >
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

            {/* Form panel */}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-2">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Image
                        src="/assets/MangoDB_Logo_nobg.png"
                        alt="MangoDB logo"
                        width={82}
                        height={82}
                        priority
                    />
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-[36px]">
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
