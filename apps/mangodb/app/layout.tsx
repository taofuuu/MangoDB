import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import Navbar from '@/components/nav/Navbar';
import NavThemeScript from '@/components/nav/NavThemeScript';
import { DEFAULT_NAV_SIZE, DEFAULT_NAV_THEME } from '@/lib/navTheme';
import './globals.css';

const ibm = IBM_Plex_Sans_Thai({
    subsets: ['thai'],
    weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
    title: 'MangoDB',
    description:
        'Find a software provider, or find work. Company profiles, services, job postings and proposals.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // suppressHydrationWarning: the script below may change
        // data-nav-theme and data-nav-size before React hydrates, and the DOM
        // should win.
        <html
            lang="th"
            data-nav-theme={DEFAULT_NAV_THEME}
            data-nav-size={DEFAULT_NAV_SIZE}
            suppressHydrationWarning
        >
            <head>
                <NavThemeScript />
            </head>
            <body className={ibm.className}>
                <Navbar />
                {children}
            </body>
        </html>
    );
}
