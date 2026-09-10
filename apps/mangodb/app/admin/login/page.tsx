import type { Metadata } from 'next';
import Image from 'next/image';
import AdminLoginForm from '@/components/auth/AdminLoginForm';

export const metadata: Metadata = {
    title: 'Administrator Login | MangoDB',
};

export default function AdminLoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FBFBFB] px-[4.17vw] py-[5.56vh]">
            <section
                aria-labelledby="admin-login-title"
                className="w-full max-w-[36.60vw] overflow-hidden rounded-button bg-[#FFFDF9] shadow-[0_0.56vh_2.22vh_rgba(0,0,0,0.10)] max-lg:max-w-[52vw] max-md:max-w-[90vw]"
            >
                <header className="border-b border-[#E5E5E5] px-[2.08vw] py-[2.04vh] text-center">
                    <h1
                        id="admin-login-title"
                        className="text-lg !font-[700] text-[#171717]"
                    >
                        Administrator Login
                    </h1>
                </header>

                <div className="px-[3vw] py-[5vh] max-md:px-[6.25vw]">
                    <div className="mb-[2.5vh] flex w-full justify-center">
                        <div className="inline-flex items-center gap-[0.4vw]">
                            <Image
                                src="/assets/MangoDB_Logo_nobg.png"
                                alt="MangoDB logo"
                                width={82}
                                height={82}
                                priority
                                className="h-[20vh] min-h-[64px] w-auto"
                            />
                            <p className="text-hd !font-[700] text-[#171717]">
                                MangoDB
                            </p>
                        </div>
                    </div>

                    <AdminLoginForm />
                </div>
            </section>
        </main>
    );
}
