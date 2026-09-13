import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
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
        <html lang="th">
            <body className={ibm.className}>{children}</body>
        </html>
    );
}
