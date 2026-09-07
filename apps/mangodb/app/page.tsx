import Link from 'next/link';

// Temporary index so the pages built so far are reachable by clicking. The
// real home page and the navbar are separate tasks; this goes when they land.
const ROUTES = [
    {
        href: '/dev/session',
        title: 'Dev session',
        detail: 'Get a token — there is no login page yet. Start here.',
    },
    {
        href: '/certificate',
        title: 'Certificates',
        detail: 'Add and edit certificate modals, on mock data.',
    },
];

export default function Home() {
    return (
        <main className="min-h-screen bg-[#FFFDF9] px-[4.06vw] pt-[6.25vh] text-[#171717]">
            <h1 className="text-hd leading-none">MangoDB</h1>

            <p className="mt-[2vh] text-md !font-[400]">Pages built so far.</p>

            <ul className="mt-[4vh] flex flex-col gap-[2vh]">
                {ROUTES.map((route) => (
                    <li key={route.href}>
                        <Link
                            href={route.href}
                            className="block w-[31.13vw] rounded-button border border-[#497B93] bg-white px-[1.2vw] py-[2vh] transition-colors hover:bg-[#497B93]/10"
                        >
                            <span className="block text-lg">{route.title}</span>

                            <span className="mt-[0.5vh] block text-md !font-[400]">
                                {route.detail}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}
