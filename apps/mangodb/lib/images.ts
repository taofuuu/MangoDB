// next/image throws while rendering when the src host is missing from
// remotePatterns in next.config.ts, which would take a whole page down for one
// bad row. Every image column in this app is a plain varchar — companyPhoto,
// portfolioImage, certImage — so a row can hold anything, and only our own
// uploads are safe to hand over.
//
// One label, matching next.config.ts's '*.supabase.co': a bare supabase.co or a
// deeper a.b.supabase.co would pass a looser check and then throw anyway.
const STORAGE_HOST = /^[^.]+\.supabase\.co$/;

export function isStorageImage(url: string | null | undefined): boolean {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);

        // remotePatterns pins the protocol too, so http on the right host
        // still throws.
        return (
            parsed.protocol === 'https:' && STORAGE_HOST.test(parsed.hostname)
        );
    } catch {
        // Not a URL at all.
        return false;
    }
}
