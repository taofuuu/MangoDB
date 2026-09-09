import Link from 'next/link';

export default function Home() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF5DC] p-8">
            <div className="rounded-2xl bg-[#FFFDF9] p-10 text-center shadow-[6px_6px_10px_rgba(0,0,0,0.25)]">
                <h1 className="text-4xl font-bold">MangoDB</h1>
                <p className="mt-3 text-[#497B93]">Welcome to MangoDB.</p>
                <Link
                    href="/register"
                    className="mt-6 inline-block rounded-[20px] bg-[#497B93] px-8 py-3 font-bold text-white"
                >
                    Sign Up
                </Link>
            </div>
        </main>
    );
}
