import Link from 'next/link';

// Temporary index so pages built so far are reachable by clicking.
const ROUTES = [
    {
        href: '/dev/session',
        title: 'Dev session',
        detail: 'Get a token — there is no login page yet. Start here.',
    },
    {
        href: '/profile/edit',
        title: 'Edit Profile',
        detail: 'US1-5 — the editable company profile form, against the API.',
    },
    {
        href: '/certificate',
        title: 'Certificates',
        detail: 'Add, edit and delete certificate modals, on mock data.',
    },
    {
        href: '/account-settings',
        title: 'Account setting',
        detail: 'Manage account settings and delete account.',
    },
    {
        href: '/login',
        title: 'Login',
        detail: 'Sign in to your company account.',
    },
    {
        href: '/portfolio',
        title: 'Portfolio',
        detail: 'Company portfolio grid and list views, on mock data.',
    },
    {
        href: '/companies',
        title: 'Companies view for admin',
        detail: 'list of company that can be viewed by admin',
    },
    {
        href: '/profile/edit?companyId=1',
        title: 'Edit account as admin',
        detail: 'US6-4 — profile form in admin mode, with Delete account (sample id 1).',
    },
    {
        href: '/register',
        title: 'Register',
        detail: 'Register new user',
    },
    {
        href: '/admin/login',
        title: 'Admin Login',
        detail: 'login for admin role',
    },
    {
        href: '/profile/view/provider',
        title: 'View Profile (Provider)',
        detail: 'View profile page for Provider role (Company card, Services, Timeline, Portfolio).',
    },
    {
        href: '/profile/view/receiver',
        title: 'View Profile (Receiver)',
        detail: 'View profile page for Receiver role (Vertical company card, Job listings).',
    },
];

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFF5DC] p-8">
            <div className="w-full max-w-md rounded-2xl bg-[#FFFDF9] p-10 text-center shadow-[6px_6px_10px_rgba(0,0,0,0.25)]">
                <h1 className="text-4xl font-bold text-[#171717]">MangoDB</h1>
                <p className="mt-3 text-[#497B93]">Welcome to MangoDB.</p>

                <Link
                    href="/register"
                    className="mt-6 inline-block w-full rounded-[20px] bg-[#497B93] px-8 py-3 font-bold text-white transition hover:bg-[#3a6276]"
                >
                    Sign Up
                </Link>

                {/* Developer Routes Navigation */}
                <div className="mt-8 text-left">
                    <h2 className="text-sm font-semibold text-[#497B93] uppercase tracking-wider">
                        Pages built so far
                    </h2>
                    <ul className="mt-3 flex flex-col gap-2">
                        {ROUTES.map((route) => (
                            <li key={route.href}>
                                <Link
                                    href={route.href}
                                    className="block rounded-lg border border-[#497B93]/30 bg-white p-3 text-left transition hover:bg-[#497B93]/10"
                                >
                                    <span className="block text-sm font-bold text-[#171717]">
                                        {route.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-gray-600">
                                        {route.detail}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    );
}
