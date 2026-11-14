// next/image throws while rendering when the src host is missing from
// remotePatterns in next.config.ts, which would take a whole page down for one
// bad row. Every image column in this app is a plain varchar — companyPhoto,
// portfolioImage, certImage — so a row can hold anything, and only our own
// uploads are safe to hand over.
//
// Our two Supabase projects, not any *.supabase.co: portfolioImage takes any
// URL a client sends, and a wildcard would let the image optimizer fetch from a
// stranger's project. next.config.ts builds remotePatterns from these same two
// values, so the check here cannot drift from the one next/image makes.
// A new Supabase project needs its host added here.
export const STORAGE_HOSTS = [
    'vlwzyfljwrkefezphuzo.supabase.co', // team database
    'zdhrtyziipqrldjimrcc.supabase.co', // hosted, see docs/deploy.md
];

// Public bucket files only. The private quotation bucket hands out signed
// links, and those are PDFs, never images.
export const STORAGE_PUBLIC_PATH = '/storage/v1/object/public/';

export function isStorageImage(url: string | null | undefined): boolean {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);

        // remotePatterns pins the protocol too, so http on the right host
        // still throws.
        return (
            parsed.protocol === 'https:' &&
            STORAGE_HOSTS.includes(parsed.hostname) &&
            parsed.pathname.startsWith(STORAGE_PUBLIC_PATH)
        );
    } catch {
        // Not a URL at all.
        return false;
    }
}
